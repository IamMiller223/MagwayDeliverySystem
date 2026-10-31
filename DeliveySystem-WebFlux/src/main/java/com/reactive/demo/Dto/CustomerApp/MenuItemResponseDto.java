package com.reactive.demo.Dto.CustomerApp;

import lombok.Builder;
import lombok.Data;


@Data
@Builder
public class MenuItemResponseDto {
    private String id;
    private String restaurantId; 
    private String name;
    private String description;
    private String image;
    private String category;
    private Double price;
    private Boolean isAvailable;
}
