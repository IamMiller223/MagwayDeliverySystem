package com.reactive.demo.Dto.RiderApp;

import java.time.LocalDateTime;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TaskCardDto {
    private String orderId;
    private String status;         // e.g., "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"
    private String deliveryAddress;
    private String customerName;
    private int itemCount;
    private double totalAmount; 
    private LocalDateTime createdAt;// For the "9,000 Ks" display
}
