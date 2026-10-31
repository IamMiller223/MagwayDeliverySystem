package com.reactive.demo.Dto.CustomerApp;

import lombok.Data;
import java.util.List;


@Data
public class OrderRequestDto {
    private String customerId;
    private Double totalAmount; 
    private String deliveryAddress;
    private Double latitude;
    private Double longitude;
    private List<OrderItemRequestDto> items;
}
