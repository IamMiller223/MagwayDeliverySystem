package com.reactive.demo.Dto.CustomerApp;



import lombok.Data;

@Data
public class OrderItemRequestDto {
    private String restaurantId; // Added!
    private String menuItemId;
    private String name;
    private String image;
    private Integer quantity;
    private Double priceAtPurchase;
}
