package com.reactive.demo.Dto.CustomerApp;


import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class OrderResponseDto {
    private String orderId;
    private String status;
    private String riderId; 
}
