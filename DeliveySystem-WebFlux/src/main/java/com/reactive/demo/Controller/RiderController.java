package com.reactive.demo.Controller;


import com.reactive.demo.Dto.*;
import com.reactive.demo.Dto.AdminApp.CreateRiderRequestDto;
import com.reactive.demo.Dto.AdminApp.RiderListResponseDto;
import com.reactive.demo.Dto.AdminApp.UpdateRiderRequestDto;
import com.reactive.demo.Dto.AdminApp.UpdateRiderResponseDto;
import com.reactive.demo.Dto.AdminApp.UpdateVehicleRequestDto;
import com.reactive.demo.Dto.AdminApp.VehicleResponseDto;
import com.reactive.demo.Dto.RiderApp.FullRiderProfileDto;
import com.reactive.demo.Dto.RiderApp.RiderNotificationDto;
import com.reactive.demo.Service.AuthService;
import com.reactive.demo.Service.NotificationService;
import com.reactive.demo.Service.RiderService;
import com.reactive.demo.Utils.ResponseUtils;

import jakarta.validation.Valid;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.List;


@RestController
@RequestMapping("/api/rider")
public class RiderController {

    private final RiderService riderService;
    private final AuthService authService; // Needed for Keycloak Creation
    
    @Autowired
    NotificationService notificationService;

    public RiderController(RiderService riderService, AuthService authService) {
        this.riderService = riderService;
        this.authService = authService;
    }

    // 1. ADMIN ONLY: Create a New Rider
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public Mono<ResponseEntity<RestResponse<com.reactive.demo.Dto.AdminApp.RiderResponseDto>>> createRider(
            @Valid @RequestBody CreateRiderRequestDto request) {
        
        // We use authService because creating a rider requires creating a Keycloak account!
        return authService.createRider(request)
                .flatMap(response -> ResponseUtils.success(
                        HttpStatus.CREATED, 
                        "Rider registered successfully", 
                        response
                ));
    }

    // 2. ADMIN ONLY: Get All Riders List
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public Mono<ResponseEntity<RestResponse<List<RiderListResponseDto>>>> getAllRiders() {
        return riderService.getAllRiders()
                .collectList()
                .flatMap(list -> ResponseUtils.success(
                        HttpStatus.OK, 
                        "Riders fetched successfully", 
                        list
                ));
    }

    @GetMapping("/{riderId}/profile")
    public Mono<ResponseEntity<RestResponse<FullRiderProfileDto>>> getRiderProfile(@PathVariable String riderId) {
        return riderService.getFullRiderProfile(riderId)
                .flatMap(profile -> ResponseUtils.success(
                        HttpStatus.OK, 
                        "Rider profile fetched successfully", 
                        profile
                ));
    }

    // 4. ADMIN & RIDER: Update Profile
    @PreAuthorize("hasAnyRole('ADMIN', 'RIDER')")
    @PutMapping("/{riderId}")
    public Mono<ResponseEntity<RestResponse<UpdateRiderResponseDto>>> updateRiderProfile(
            @PathVariable String riderId,
            @Valid @RequestBody UpdateRiderRequestDto request) {
        
        return riderService.updateRiderProfile(riderId, request)
                .flatMap(response -> ResponseUtils.success(
                        HttpStatus.OK, 
                        "Rider profile updated", 
                        response
                ));
    }

    // 5. ADMIN & RIDER: Update Vehicle
    @PreAuthorize("hasAnyRole('ADMIN', 'RIDER')")
    @PutMapping("/{riderId}/vehicle")
    public Mono<ResponseEntity<RestResponse<VehicleResponseDto>>> updateRiderVehicle(
            @PathVariable String riderId,
            @Valid @RequestBody UpdateVehicleRequestDto request) {
        
        return riderService.updateRiderVehicle(riderId, request)
                .flatMap(response -> ResponseUtils.success(
                        HttpStatus.OK, 
                        "Vehicle details updated", 
                        response
                ));
    }

    // 6. ADMIN ONLY: Delete Rider
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{riderId}")
    public Mono<ResponseEntity<RestResponse<Boolean>>> deleteRider(@PathVariable String riderId) {
        
        return riderService.deleteRider(riderId)
                .flatMap(success -> ResponseUtils.success(
                        HttpStatus.OK, 
                        "Rider removed completely", 
                        success
                ));
    }
    
    @PreAuthorize("hasRole('RIDER')")
    @GetMapping(value = "/{riderId}/notifications", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<RiderNotificationDto>> streamRiderNotifications(@PathVariable String riderId) {
        
        // 1. The main data stream from our Sink
        Flux<ServerSentEvent<RiderNotificationDto>> eventStream = notificationService.getNotificationsForRider(riderId)
                .map(notification -> ServerSentEvent.<RiderNotificationDto>builder()
                        .event(notification.getType()) 
                        .data(notification)            
                        .build());

        // 2. A continuous heartbeat stream (fires an empty comment every 30 seconds)
        // This prevents NGINX, AWS, or Postman from dropping the connection due to inactivity!
        Flux<ServerSentEvent<RiderNotificationDto>> heartbeatStream = Flux.interval(Duration.ofSeconds(30))
                .map(i -> ServerSentEvent.<RiderNotificationDto>builder()
                        .comment("keep-alive")
                        .build());

        // 3. Merge them together and send an immediate success event
        return Flux.merge(eventStream, heartbeatStream)
                .startWith(ServerSentEvent.<RiderNotificationDto>builder()
                        .event("CONNECTED")
                        .comment("Successfully connected to the live notification stream")
                        .build());
    }
}
