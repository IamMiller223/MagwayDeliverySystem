package com.reactive.demo.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.reactive.demo.Dto.*;
import com.reactive.demo.Dto.AdminApp.CreateRiderRequestDto;
import com.reactive.demo.Dto.AdminApp.RiderResponseDto;
import com.reactive.demo.Dto.AdminApp.VehicleResponseDto; // ADD THIS LINE (Or CustomerApp if you put it there!)
import com.reactive.demo.Dto.CustomerApp.UpdateUserRequestDto;
import com.reactive.demo.Dto.CustomerApp.UserInfoDto;
import com.reactive.demo.Dto.Exception.AccountNotVerifiedException;
import com.reactive.demo.Dto.Exception.AuthenticationFailedException;
import com.reactive.demo.Dto.Exception.ResourceNotFoundException;
import com.reactive.demo.Model.User;
import com.reactive.demo.Model.Vehicle;
import com.reactive.demo.Repository.UserRepository;
import com.reactive.demo.Repository.VehicleRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@Service
public class AuthService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper;
    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;

    @Value("${KEYCLOAK_CLIENT_SECRET}") 
    private String CLIENT_SECRET;

    @Value("${KEYCLOAK_BASE_URL:http://localhost:9090}")
    private String keycloakBaseUrl;

    public AuthService(WebClient.Builder webClientBuilder, ObjectMapper objectMapper, 
                       UserRepository userRepository, VehicleRepository vehicleRepository) {
        this.webClient = webClientBuilder.build();
        this.objectMapper = objectMapper;
        this.userRepository = userRepository;
        this.vehicleRepository = vehicleRepository;
    }
    
    private Mono<String> getAdminToken() {
        String realm = "delivery-realm";
        String clientId = "delivery-app"; 

        return webClient.post()
                .uri(keycloakBaseUrl + "/realms/" + realm + "/protocol/openid-connect/token")
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_FORM_URLENCODED_VALUE)
                .body(BodyInserters.fromFormData("grant_type", "client_credentials")
                        .with("client_id", clientId)
                        .with("client_secret", CLIENT_SECRET)) // FIX: Uses global secret!
                .retrieve()
                .bodyToMono(com.fasterxml.jackson.databind.JsonNode.class)
                .map(jsonNode -> jsonNode.get("access_token").asText());
    }

    public Mono<LoginResponseDto> login(LoginRequestDto request) {
        return webClient.post()
                .uri(keycloakBaseUrl + "/realms/delivery-realm/protocol/openid-connect/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(BodyInserters.fromFormData("client_id", "delivery-app")
                        .with("client_secret", CLIENT_SECRET)
                        .with("username", request.getEmail())
                        .with("password", request.getPassword())
                        .with("grant_type", "password"))
                .retrieve()
                .bodyToMono(Map.class)
                .flatMap(response -> {
                    String token = (String) response.get("access_token");
                    try {
                        String[] chunks = token.split("\\.");
                        String payload = new String(Base64.getUrlDecoder().decode(chunks[1]));
                        JsonNode jwtNode = objectMapper.readTree(payload);

                        String userRole = "CUSTOMER"; 
                        if (jwtNode.has("realm_access") && jwtNode.get("realm_access").has("roles")) {
                            boolean isAdmin = false;
                            boolean isRider = false;
                            
                            for (JsonNode roleNode : jwtNode.get("realm_access").get("roles")) {
                                String r = roleNode.asText().toUpperCase();
                                if (r.equals("ADMIN")) isAdmin = true;
                                if (r.equals("RIDER")) isRider = true;
                            }
                            
                            if (isAdmin) {
                                userRole = "ADMIN";
                            } else if (isRider) {
                                userRole = "RIDER";
                            }
                        }

                        String userId = jwtNode.get("sub").asText();
                        
                        String name = request.getEmail();
                        if (jwtNode.has("name")) {
                            name = jwtNode.get("name").asText();
                        } else if (jwtNode.has("given_name")) {
                            name = jwtNode.get("given_name").asText();
                            if (jwtNode.has("family_name")) {
                                name += " " + jwtNode.get("family_name").asText();
                            }
                        }
                        
                        final String finalUserRole = userRole;
                        final String finalName = name;

                        return userRepository.findById(userId)
                                .map(existingUser -> LoginResponseDto.builder()
                                        .userId(userId)
                                        .name(existingUser.getName()) 
                                        .role(finalUserRole)
                                        .token(token)
                                        .img(existingUser.getImage()) 
                                        .build())
                                .switchIfEmpty(Mono.defer(() -> {
                                    User syncUser = User.builder()
                                            .id(userId)
                                            .name(finalName)
                                            .email(request.getEmail())
                                            .role(finalUserRole)
                                            .build();
                                            
                                    LoginResponseDto loginResponse = LoginResponseDto.builder()
                                            .userId(userId)
                                            .name(finalName)
                                            .role(finalUserRole)
                                            .token(token)
                                            .img(null)
                                            .build();

                                    return userRepository.save(syncUser).thenReturn(loginResponse);
                                }));

                    } catch (Exception e) {
                        return Mono.error(new RuntimeException("Error parsing identity token"));
                    }
                })
                .onErrorResume(org.springframework.web.reactive.function.client.WebClientResponseException.class, ex -> {
                    String responseBody = ex.getResponseBodyAsString();
                    
                    if (responseBody != null && responseBody.contains("Account is not fully set up")) {
                        return Mono.error(new AccountNotVerifiedException("Email address has not been verified."));
                    }
                    
                    return Mono.error(new AuthenticationFailedException("Invalid email or password"));
                });
    }

    public Mono<SignupResponseDto> signUp(SignupRequestDto request) {
        return webClient.post()
                .uri(keycloakBaseUrl + "/realms/delivery-realm/protocol/openid-connect/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(BodyInserters.fromFormData("client_id", "delivery-app")
                        .with("client_secret", CLIENT_SECRET)
                        .with("grant_type", "client_credentials"))
                .retrieve()
                .bodyToMono(Map.class)
                .flatMap(tokenMap -> {
                    String adminToken = (String) tokenMap.get("access_token");
                    
                    Map<String, Object> keycloakUser = Map.of(
                            "username", request.getEmail(),
                            "email", request.getEmail(),
                            "firstName", request.getName(),
                            "lastName", "",
                            "enabled", true,
                            "requiredActions", List.of("VERIFY_EMAIL"), 
                            "credentials", List.of(Map.of("type", "password", "value", request.getPassword(), "temporary", false))
                    );

                    return webClient.post()
                            .uri(keycloakBaseUrl + "/admin/realms/delivery-realm/users")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .bodyValue(keycloakUser)
                            .retrieve()
                            .onStatus(status -> status.value() == 409, 
                                      response -> Mono.error(new AuthenticationFailedException("Email address is already in use.")))
                            .toBodilessEntity()
                            .flatMap(clientResponse -> {
                                String location = clientResponse.getHeaders().getLocation().getPath();
                                String newUserId = location.substring(location.lastIndexOf("/") + 1);
                                
                                return webClient.put()
                                        .uri(keycloakBaseUrl + "/admin/realms/delivery-realm/users/" + newUserId + "/send-verify-email?client_id=delivery-app")
                                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                                        .retrieve()
                                        .toBodilessEntity()
                                        .flatMap(r -> userRepository.save(User.builder()
                                                .id(newUserId)
                                                .name(request.getName())
                                                .email(request.getEmail())
                                                .role("CUSTOMER")
                                                .build()))
                                        .map(savedUser -> SignupResponseDto.builder()
                                                .userId(savedUser.getId())
                                                .name(savedUser.getName())
                                                .email(savedUser.getEmail())
                                                .role(savedUser.getRole())
                                                .build());
                            });
                });
    }

    public Mono<RiderResponseDto> createRider(CreateRiderRequestDto request) {
        String realm = "delivery-realm";

        // 1. Get an Admin Token to talk to Keycloak
        return getAdminToken().flatMap(adminToken -> {
            
            // 2. Prepare the Keycloak User JSON (Auto-verifies email!)
            String userJson = String.format(
                "{\"username\":\"%s\",\"email\":\"%s\",\"firstName\":\"%s\",\"enabled\":true,\"emailVerified\":true,\"credentials\":[{\"type\":\"password\",\"value\":\"%s\",\"temporary\":false}]}",
                request.getEmail(), request.getEmail(), request.getName(), request.getPassword()
            );

            // 3. Create the User in Keycloak
            return webClient.post()
                    .uri(keycloakBaseUrl + "/admin/realms/" + realm + "/users")
                    .header("Authorization", "Bearer " + adminToken)
                    .header("Content-Type", "application/json")
                    .bodyValue(userJson)
                    .retrieve()
                    // --- ADD THIS LINE TO CATCH THE DUPLICATE EMAIL ---
                    .onStatus(status -> status.value() == 409, 
                              response -> Mono.error(new AuthenticationFailedException("Email address is already in use by another user.")))
                    .toBodilessEntity()
                    .flatMap(response -> {
                        if (response.getStatusCode().is2xxSuccessful()) {
                            
                            // 4. Fetch the new user's Keycloak ID
                            return webClient.get()
                                    .uri(keycloakBaseUrl + "/admin/realms/" + realm + "/users?email=" + request.getEmail())
                                    .header("Authorization", "Bearer " + adminToken)
                                    .retrieve()
                                    .bodyToMono(com.fasterxml.jackson.databind.JsonNode.class)
                                    .flatMap(users -> {
                                        String keycloakUserId = users.get(0).get("id").asText();

                                        // 5. Fetch the 'RIDER' role ID from Keycloak
                                        return webClient.get()
                                                .uri(keycloakBaseUrl + "/admin/realms/" + realm + "/roles/RIDER")
                                                .header("Authorization", "Bearer " + adminToken)
                                                .retrieve()
                                                .bodyToMono(com.fasterxml.jackson.databind.JsonNode.class)
                                                .flatMap(roleNode -> {
                                                    
                                                    // 6. Assign the 'RIDER' role to the user
                                                    String roleJson = String.format(
                                                        "[{\"id\":\"%s\",\"name\":\"RIDER\"}]",
                                                        roleNode.get("id").asText()
                                                    );

                                                    return webClient.post()
                                                            .uri(keycloakBaseUrl + "/admin/realms/" + realm + "/users/" + keycloakUserId + "/role-mappings/realm")
                                                            .header("Authorization", "Bearer " + adminToken)
                                                            .header("Content-Type", "application/json")
                                                            .bodyValue(roleJson)
                                                            .retrieve()
                                                            .toBodilessEntity()
                                                            .flatMap(roleAssignResponse -> {
                                                    
                                                                // 7. Save User to MongoDB
                                                                User newRider = User.builder()
                                                                        .id(keycloakUserId)
                                                                        .name(request.getName())
                                                                        .email(request.getEmail())
                                                                        .phone(request.getPhone())
                                                                        .image(request.getImage()) 
                                                                        .createdAt(LocalDateTime.now())
                                                                        .updatedAt(LocalDateTime.now())
                                                                        .role("RIDER")
                                                                        .status("AVAILABLE") 
                                                                        .nrcNumber(request.getNrcNumber()) 
                                                                        .build();

                                                                return userRepository.save(newRider)
                                                                        .flatMap(savedUser -> {
                                                                            
                                                                            // 8. IMMEDIATELY Save Vehicle to MongoDB
                                                                            Vehicle vehicle = Vehicle.builder()
                                                                                    .riderId(savedUser.getId())
                                                                                    .type(request.getVehicleType())
                                                                                    .licenceNumber(request.getLicenceNumber())
                                                                                    .build();
                                                                            
                                                                            return vehicleRepository.save(vehicle)
                                                                                    // 9. Map BOTH into the new RiderResponseDto
                                                                                    .map(savedVehicle -> RiderResponseDto.builder()
                                                                                            .userId(savedUser.getId())
                                                                                            .name(savedUser.getName())
                                                                                            .email(savedUser.getEmail())
                                                                                            .phone(savedUser.getPhone())
                                                                                            .role(savedUser.getRole())
                                                                                            .status(savedUser.getStatus()) 
                                                                                            .nrcNumber(savedUser.getNrcNumber()) 
                                                                                            .vehicle(VehicleResponseDto.builder()
                                                                                                    .id(savedVehicle.getId())
                                                                                                    .riderId(savedVehicle.getRiderId())
                                                                                                    .type(savedVehicle.getType())
                                                                                                    .licenceNumber(savedVehicle.getLicenceNumber())
                                                                                                    .createdAt(savedVehicle.getCreatedAt())
                                                                                                    .build())
                                                                                            .build());
                                                                        });
                                                            });
                                                });
                                    });
                        } else {
                            return Mono.error(new RuntimeException("Failed to create user in Keycloak"));
                        }
                    });
        });
    }

    public Mono<UserInfoDto> getUserInfo(String userId) {
        return userRepository.findById(userId)
                .switchIfEmpty(Mono.error(new ResourceNotFoundException("User profile not found in database")))
                .map(user -> UserInfoDto.builder()
                        .userId(user.getId())
                        .name(user.getName())
                        .email(user.getEmail())
                        .image(user.getImage())
                        .phone(user.getPhone())
                        .role(user.getRole())
                        .build());
    }
    
    public Mono<UserInfoDto> updateUserProfile(String userId, UpdateUserRequestDto request) {
        return userRepository.findById(userId)
                .switchIfEmpty(Mono.error(new ResourceNotFoundException("User profile not found in database")))
                .flatMap(existingUser -> {
                    if (request.getName() != null) existingUser.setName(request.getName());
                    if (request.getImage() != null) existingUser.setImage(request.getImage());
                    if (request.getPhone() != null) existingUser.setPhone(request.getPhone());
                    
                    return userRepository.save(existingUser);
                })
                .map(savedUser -> UserInfoDto.builder()
                        .userId(savedUser.getId())
                        .name(savedUser.getName())
                        .image(savedUser.getImage())
                        .email(savedUser.getEmail())
                        .phone(savedUser.getPhone())
                        .role(savedUser.getRole())
                        .build());
    }

    public Mono<Void> deleteUserInKeycloak(String userId) {
        String realm = "delivery-realm";

        return getAdminToken().flatMap(adminToken -> 
                webClient.delete()
                        .uri(keycloakBaseUrl + "/admin/realms/" + realm + "/users/" + userId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .retrieve()
                        .bodyToMono(Void.class)
        ).onErrorResume(e -> {
            return Mono.empty(); 
        });
    }
    

    // --- 1. EMAIL UPDATE LOGIC ---
    public Mono<Boolean> updateEmail(String userId, UpdateEmailRequestDto request) {
        String realm = "delivery-realm";

        return getAdminToken().flatMap(adminToken -> {
            
            //set emailVerified to false so Keycloak forces them to verify the new email address.
            Map<String, Object> emailPayload = Map.of(
                    "email", request.getNewEmail(),
                    "username", request.getNewEmail(), 
                    "emailVerified", false 
            );

            return webClient.put()
                    .uri(keycloakBaseUrl + "/admin/realms/" + realm + "/users/" + userId)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                    .contentType(MediaType.APPLICATION_JSON) 
                    .bodyValue(emailPayload)
                    .retrieve()
                    // If someone else already registered with this new email, Keycloak returns 409 Conflict
                    .onStatus(status -> status.value() == 409,
                            response -> Mono.error(new AuthenticationFailedException("Email address is already in use by another account.")))
                    // Add custom error handling to catch and log any other Keycloak errors (like 400 Bad Request)
                    .onStatus(status -> status.is4xxClientError(),
                            response -> response.bodyToMono(String.class).flatMap(errorBody -> {
                                System.err.println("Keycloak Update User Error (4xx): " + errorBody);
                                return Mono.error(new RuntimeException("Failed to update user in Keycloak. See logs."));
                            }))
                    .toBodilessEntity()
                    
                    // 1a. If successful in Keycloak, immediately sync new email to MongoDB
                    .then(userRepository.findById(userId)
                            .flatMap(user -> {
                                user.setEmail(request.getNewEmail());
                                return userRepository.save(user);
                            }))
                            
                    // 1b. Trigger Keycloak to send the Verification Email to their NEW address!
                    .then(webClient.put()
                            .uri(keycloakBaseUrl + "/admin/realms/" + realm + "/users/" + userId + "/send-verify-email?client_id=delivery-app")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                            .retrieve()
                            .toBodilessEntity()
                            .onErrorResume(e -> Mono.empty()) // Don't crash if the email server is offline
                    )
                    .thenReturn(true);
        });
    }

    // --- 2. PASSWORD UPDATE LOGIC ---
    public Mono<Boolean> updatePassword(String userId, UpdatePasswordRequestDto request) {
        String realm = "delivery-realm";

        // 2a. Fetch the user's email from MongoDB first
        return userRepository.findById(userId)
                .switchIfEmpty(Mono.error(new ResourceNotFoundException("User not found in database")))
                .flatMap(user -> {
                    
                    // 2b. Secretly try to log them in with their OLD password to verify identity!
                    LoginRequestDto tempLogin = new LoginRequestDto();
                    tempLogin.setEmail(user.getEmail());
                    tempLogin.setPassword(request.getOldPassword());
                    
                    return login(tempLogin)
                            // If login fails, we block the password update instantly!
                            .onErrorMap(e -> new AuthenticationFailedException("Incorrect current password. Update denied."));
                })
                
                // 2c. If the old password was correct, proceed to update Keycloak!
                .flatMap(loginResponse -> getAdminToken())
                .flatMap(adminToken -> {
                    Map<String, Object> passwordPayload = Map.of(
                            "type", "password",
                            "value", request.getNewPassword(),
                            "temporary", false
                    );

                    return webClient.put()
                            .uri(keycloakBaseUrl + "/admin/realms/" + realm + "/users/" + userId + "/reset-password")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .bodyValue(passwordPayload)
                            .retrieve()
                            .toBodilessEntity()
                            .thenReturn(true);
                });
    }
}