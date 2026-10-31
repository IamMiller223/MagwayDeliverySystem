package com.reactive.demo.Dto.AdminApp;

import lombok.Data;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Data
public class MenuItemCreateDto {
    @NotBlank(message = "Item name is required")
    private String name;
    
    private String description;
    
    private String image;
    
    private String category;
    
    @NotNull(message = "Price is required")
    @Min(value = 0, message = "Price cannot be negative")
    private Double price;
    
    private Boolean isAvailable = true; // Default to true if not provided
}
