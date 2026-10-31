package com.reactive.demo.Controller;


import com.reactive.demo.Dto.*;
import com.reactive.demo.Dto.CustomerApp.UpdateUserRequestDto;
import com.reactive.demo.Dto.CustomerApp.UserInfoDto;
import com.reactive.demo.Service.AuthService;
import com.reactive.demo.Utils.ResponseUtils;

import jakarta.validation.Valid;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public Mono<ResponseEntity<RestResponse<LoginResponseDto>>> login(@Valid @RequestBody LoginRequestDto request) {
        return authService.login(request)
                .flatMap(data -> ResponseUtils.success(HttpStatus.OK, "Login successful", data));
    }

    @PostMapping("/sign-up")
    public Mono<ResponseEntity<RestResponse<SignupResponseDto>>> signUp(@Valid @RequestBody SignupRequestDto request) {
        return authService.signUp(request)
                .flatMap(data -> ResponseUtils.success(HttpStatus.CREATED, "Registration successful", data));
    }
    
    @GetMapping("/user/{userId}")
    public Mono<ResponseEntity<RestResponse<UserInfoDto>>> getUserInfo(@PathVariable String userId) {
        return authService.getUserInfo(userId)
                .flatMap(userInfo -> ResponseUtils.success(
                        HttpStatus.OK, 
                        "User profile fetched successfully", 
                        userInfo
                ));
    }
    
    @PutMapping("/user/{userId}")
    public Mono<ResponseEntity<RestResponse<UserInfoDto>>> updateProfile(
            @PathVariable String userId,
            @Valid @RequestBody UpdateUserRequestDto request) { 
        
        return authService.updateUserProfile(userId, request)
                .flatMap(updatedInfo -> ResponseUtils.success(
                        HttpStatus.OK, 
                        "User profile updated successfully", 
                        updatedInfo
                ));
    }
    
    @PreAuthorize("hasAnyRole('ADMIN', 'CUSTOMER', 'RIDER')")
    @PutMapping("/user/{userId}/email")
    public Mono<ResponseEntity<RestResponse<Boolean>>> updateEmail(
            @PathVariable String userId,
            @Valid @RequestBody UpdateEmailRequestDto request,
            @AuthenticationPrincipal Jwt jwt) { 
        
        if (isUnauthorized(jwt, userId)) {
            return ResponseUtils.error(HttpStatus.FORBIDDEN, "Security Violation", "You cannot modify another user's email.");
        }
        
        return authService.updateEmail(userId, request)
                .flatMap(success -> ResponseUtils.success(HttpStatus.OK, "Email updated! Please check your new inbox to verify your account.", success));
    }

    // --- 2. PASSWORD UPDATE ENDPOINT ---
    @PreAuthorize("hasAnyRole('ADMIN', 'CUSTOMER', 'RIDER')")
    @PutMapping("/user/{userId}/password")
    public Mono<ResponseEntity<RestResponse<Boolean>>> updatePassword(
            @PathVariable String userId,
            @Valid @RequestBody UpdatePasswordRequestDto request,
            @AuthenticationPrincipal Jwt jwt) { 
        
        if (isUnauthorized(jwt, userId)) {
            return ResponseUtils.error(HttpStatus.FORBIDDEN, "Security Violation", "You cannot modify another user's password.");
        }
        
        return authService.updatePassword(userId, request)
                .flatMap(success -> ResponseUtils.success(HttpStatus.OK, "Password updated successfully", success));
    }

    // --- SECURITY HELPER METHOD ---
    private boolean isUnauthorized(Jwt jwt, String targetUserId) {
        String loggedInUserId = jwt.getSubject();
        boolean isAdmin = false;

        // 1. Extract the realm_access object as a Map
        java.util.Map<String, Object> realmAccess = jwt.getClaim("realm_access");

        // 2. Dig into the map to find the "roles" list
        if (realmAccess != null && realmAccess.containsKey("roles")) {

			java.util.List<String> roles = (List<String>) realmAccess.get("roles");
            isAdmin = roles != null && roles.contains("ADMIN");
        }
        
        // If they are not an Admin, they can only modify their OWN user ID.
        return !isAdmin && !loggedInUserId.equals(targetUserId);
    }
    

}
