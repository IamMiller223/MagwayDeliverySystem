package com.reactive.demo.Dto.CustomerApp;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class OrderDetailItemDto {
    private String restaurantId; 
    private String name;
    private String image;
    private Integer quantity;
    private Double priceAtPurchase;
}
