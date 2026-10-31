package com.reactive.demo.Dto.AdminApp;

import lombok.Data;

@Data
public class LocationUpdateDto {
    private String riderId;
    private double latitude;
    private double longitude;
    
    // Optional: Could be "AVAILABLE" or "BUSY". We can use this to update their status in Redis!
    private String status; 
}
