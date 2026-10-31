package com.reactive.demo.Controller;


import com.reactive.demo.Dto.CustomerApp.UpdateUserRequestDto;
import com.reactive.demo.Dto.CustomerApp.UserInfoDto;
import com.reactive.demo.Dto.RestResponse;
import com.reactive.demo.Service.UserService;
import com.reactive.demo.Utils.ResponseUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;

@RestController
@RequestMapping("/api/user")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    // 1. ADMIN ONLY: Get All Customers
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public Mono<ResponseEntity<RestResponse<List<UserInfoDto>>>> getAllCustomers() {
        return userService.getAllCustomers()
                .collectList()
                .flatMap(list -> ResponseUtils.success(
                        HttpStatus.OK, 
                        "Customers fetched successfully", 
                        list
                ));
    }

    // 2. ADMIN & CUSTOMER: Get Single User Profile
    @PreAuthorize("hasAnyRole('ADMIN', 'CUSTOMER')")
    @GetMapping("/{userId}")
    public Mono<ResponseEntity<RestResponse<UserInfoDto>>> getUserById(@PathVariable String userId) {
        return userService.getUserById(userId)
                .flatMap(response -> ResponseUtils.success(
                        HttpStatus.OK, 
                        "User profile fetched successfully", 
                        response
                ));
    }

    // 3. ADMIN & CUSTOMER: Update Profile
    @PreAuthorize("hasAnyRole('ADMIN', 'CUSTOMER')")
    @PutMapping("/{userId}")
    public Mono<ResponseEntity<RestResponse<UserInfoDto>>> updateUserProfile(
            @PathVariable String userId,
            @RequestBody UpdateUserRequestDto request) {
        
        return userService.updateUserProfile(userId, request)
                .flatMap(response -> ResponseUtils.success(
                        HttpStatus.OK, 
                        "User profile updated successfully", 
                        response
                ));
    }

    // 4. ADMIN ONLY: Delete Customer
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{userId}")
    public Mono<ResponseEntity<RestResponse<Boolean>>> deleteUser(@PathVariable String userId) {
        return userService.deleteUser(userId)
                .flatMap(success -> ResponseUtils.success(
                        HttpStatus.OK, 
                        "Customer removed completely", 
                        success
                ));
    }
}
