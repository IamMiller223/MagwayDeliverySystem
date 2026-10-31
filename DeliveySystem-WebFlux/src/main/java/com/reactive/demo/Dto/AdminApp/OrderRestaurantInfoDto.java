package com.reactive.demo.Dto.AdminApp;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class OrderRestaurantInfoDto {
    private String restaurantId;
    private String name;
    private String phone;
    private String image;
    private String address;
    
    // Restaurant exact coordinates
    private Double latitude; 
    private Double longitude; 
}
