package com.reactive.demo.Model;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "delivery_config")
public class DeliveryConfig {
    @Id
    private String id; 
    
    private double baseDeliveryFee;
    private double deliveryFeePerKm;
    private double multiStopFee;
    
    // You can even make your ceiling rounding dynamic (e.g., round to nearest 10, 50, or 100)
    private double roundingCeiling; 
}
