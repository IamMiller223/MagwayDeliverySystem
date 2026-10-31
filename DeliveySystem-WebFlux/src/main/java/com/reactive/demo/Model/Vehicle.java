package com.reactive.demo.Model;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "vehicles")
public class Vehicle {
    
    @Id
    private String id;
    
    // The Foreign Key linking to the users collection
    private String riderId; 
    
    private String type; // e.g., 'Bike', 'Scooter', 'Car'
    private String licenceNumber;
    
    @CreatedDate
    private LocalDateTime createdAt;
}