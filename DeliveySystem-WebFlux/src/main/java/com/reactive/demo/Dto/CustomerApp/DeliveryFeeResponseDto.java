package com.reactive.demo.Dto.CustomerApp;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DeliveryFeeResponseDto {
    private Double totalDistanceKm;
    private Double deliveryFee;   // Just the driving/multi-stop fee
    private Double itemsTotal;    // The total cost of the food
    private Double grandTotal;    // Delivery Fee + Food Total
}
