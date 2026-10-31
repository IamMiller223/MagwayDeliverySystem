package com.reactive.demo.Dto.AdminApp;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class OrderRiderInfoDto {
    private String riderId;
    private String name;
    private String phone;
    
    // --- ADDED ALL RIDER INFO FIELDS ---
    private String email;
    private String image;
    private String status;
    private String nrcNumber;
    
    // Rider's last known live coordinates
    private Double latitude; 
    private Double longitude; 
    
    private VehicleResponseDto vehicle;
}
