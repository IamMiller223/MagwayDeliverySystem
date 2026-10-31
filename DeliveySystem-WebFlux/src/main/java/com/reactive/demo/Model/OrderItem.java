package com.reactive.demo.Model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderItem {
	private String restaurantId; // Added!
    private String itemId;
    private String name;
    private String image;
    private Integer quantity;
    private Double priceAtPurchase;
}
