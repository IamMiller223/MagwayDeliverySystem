package com.reactive.demo.Dto.CustomerApp;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RestaurantResponseDto {
    private String restaurantId; 
    private String name;
    private String phone; 
    private String image;
    private String address;
    private double latitude;
    private double longitude;
}
