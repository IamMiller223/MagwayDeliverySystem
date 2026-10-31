package com.reactive.demo.Dto.AdminApp;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;


@Data
public class CreateRestaurantRequestDto {
    
    @NotBlank(message = "Restaurant name is required")
    private String name;

    @NotBlank(message = "Phone number is required")
    private String phone; 
    
    private String image;

    @NotBlank(message = "Address is required")
    private String address;

    @NotNull(message = "Latitude is required")
    private Double latitude;

    @NotNull(message = "Longitude is required")
    private Double longitude;
}
