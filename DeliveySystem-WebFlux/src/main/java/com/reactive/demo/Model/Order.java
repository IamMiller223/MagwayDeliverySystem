package com.reactive.demo.Model;



import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "orders")
public class Order {
    
    @Id
    private String id; 
    
    private String customerId;
    
    List<String> restaurantsId;
    
    private String riderId; 
    
    private String status; 
    
    private Double totalAmount;
    
    private DeliveryLocation deliveryLocation;
    
    
    private List<OrderItem> items;
    
    @CreatedDate
    private LocalDateTime createdAt;
    
    private String paymentImg;
}
