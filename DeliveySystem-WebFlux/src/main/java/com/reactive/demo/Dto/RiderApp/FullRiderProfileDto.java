package com.reactive.demo.Dto.RiderApp;

import com.reactive.demo.Dto.AdminApp.VehicleResponseDto;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FullRiderProfileDto {
    private String userId;
    private String name;
    private String email;
    private String phone;
    private String image;
    private String role;
    private String status;
    private String nrcNumber;
    
    // Nests the vehicle data inside the rider profile!
    private VehicleResponseDto vehicle; 
}
