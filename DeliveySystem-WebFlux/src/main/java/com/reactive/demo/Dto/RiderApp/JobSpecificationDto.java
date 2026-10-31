package com.reactive.demo.Dto.RiderApp;

import java.time.LocalDateTime;
import java.util.List;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class JobSpecificationDto {
    private String orderId;
    private String status;
    private LocalDateTime createdAt;
    
    private List<PickupDto> pickupLocations;
    private String deliveryDestinationAddress;
    
    private RecipientDto recipient;
    
    private List<ReceiptItemDto> receiptSummary;
    private double totalCashCollect;
    
    @Data @Builder public static class PickupDto {
        private String restaurantName;
        private String address;
        private double latitude;
        private double longitude;
    }
    
    @Data @Builder public static class RecipientDto {
        private String name;
        private String phone;
        private double latitude;
        private double longitude;
        private String image;
    }
    
    @Data @Builder public static class ReceiptItemDto {
        private int quantity;
        private String name;
        private double price;
    }
    
    
    private Double itemsTotal;
    private Double deliveryFee;
    private Double totalDistanceKm;
    private Integer extraStops;
}
