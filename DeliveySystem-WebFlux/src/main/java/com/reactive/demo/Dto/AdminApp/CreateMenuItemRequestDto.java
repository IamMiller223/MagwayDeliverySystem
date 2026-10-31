package com.reactive.demo.Dto.AdminApp;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateMenuItemRequestDto {

	@NotBlank(message = "Item name is required")
    private String name;

    private String description;
    private String image;

    @NotBlank(message = "Category is required (e.g., Drinks, Main Course)")
    private String category;

    @NotNull(message = "Price is required")
    @Min(value = 0, message = "Price cannot be negative")
    private Double price;

    @NotNull(message = "Availability status is required")
    private Boolean isAvailable;
    
}
