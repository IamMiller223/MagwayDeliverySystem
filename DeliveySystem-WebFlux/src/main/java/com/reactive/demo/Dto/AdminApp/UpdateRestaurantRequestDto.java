package com.reactive.demo.Dto.AdminApp;

import lombok.Data;

@Data
public class UpdateRestaurantRequestDto {
    // All fields are optional because the Admin might only want to update one thing at a time
    private String name;
    private String phone;  
    private String image;
    private String address;
    private Double latitude;
    private Double longitude;
}
