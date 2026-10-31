package com.reactive.demo.Service.Impl;


import com.reactive.demo.Dto.CustomerApp.UpdateUserRequestDto;
import com.reactive.demo.Dto.CustomerApp.UserInfoDto;
import com.reactive.demo.Dto.Exception.ResourceNotFoundException;
import com.reactive.demo.Repository.UserRepository;
import com.reactive.demo.Service.AuthService;
import com.reactive.demo.Service.UserService;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final AuthService authService; // Needed to delete from Keycloak

    public UserServiceImpl(UserRepository userRepository, AuthService authService) {
        this.userRepository = userRepository;
        this.authService = authService;
    }

    // 1. Get All Customers
    @Override
    public Flux<UserInfoDto> getAllCustomers() {
        return userRepository.findByRole("CUSTOMER")
                .map(user -> UserInfoDto.builder()
                        .userId(user.getId())
                        .name(user.getName())
                        .email(user.getEmail())
                        .image(user.getImage())
                        .phone(user.getPhone())
                        .role(user.getRole())
                        .build());
    }

    // 2. Get Single User
    @Override
    public Mono<UserInfoDto> getUserById(String userId) {
        return userRepository.findById(userId)
                .switchIfEmpty(Mono.error(new ResourceNotFoundException("User not found in database.")))
                .map(user -> UserInfoDto.builder()
                        .userId(user.getId())
                        .name(user.getName())
                        .email(user.getEmail())
                        .image(user.getImage())
                        .phone(user.getPhone())
                        .role(user.getRole())
                        .build());
    }

    // 3. Update User Profile
    @Override
    public Mono<UserInfoDto> updateUserProfile(String userId, UpdateUserRequestDto request) {
        return userRepository.findById(userId)
                .switchIfEmpty(Mono.error(new ResourceNotFoundException("User not found in database.")))
                .flatMap(existingUser -> {
                    // Update only basic profile info (Keycloak syncs email/password separately)
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

    // 4. Delete User
    @Override
    public Mono<Boolean> deleteUser(String userId) {
        return userRepository.findById(userId)
                .switchIfEmpty(Mono.error(new ResourceNotFoundException("User not found in database.")))
                .flatMap(user -> {
                    Mono<Void> deleteMongo = userRepository.delete(user);
                    Mono<Void> deleteKeycloak = authService.deleteUserInKeycloak(userId);

                    // Execute both deletions simultaneously
                    return Mono.when(deleteMongo, deleteKeycloak).thenReturn(true);
                });
    }
}
