package com.reactive.demo.Dto.AdminApp;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RiderResponseDto {
    private String userId; // This is the Rider's ID
    private String name;
    private String image;
    private String phone;
    private String email;
    private String role;
    
    // --- NEW FIELDS ADDED ---
    private String status;
    private String nrcNumber;
    
    // Nested vehicle information
    private VehicleResponseDto vehicle;
}
