package com.reactive.demo.Dto.AdminApp;

import lombok.Data;

@Data
public class UpdateMenuItemRequestDto {
   
	private String name;
    private String description;
    private String image;
    private String category;
    private Double price;
    private Boolean isAvailable;
}
