package com.reactive.demo.Dto.CustomerApp;


import lombok.Data;
import java.util.List;

@Data
public class CalculateFeeRequestDto {
    private Double latitude;
    private Double longitude;
    // Pass the exact same items array that the frontend will use to create the order
    private List<OrderItemRequestDto> items; 
}
