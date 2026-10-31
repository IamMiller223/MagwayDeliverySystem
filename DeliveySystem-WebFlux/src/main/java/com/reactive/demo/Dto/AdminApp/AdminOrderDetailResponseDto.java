package com.reactive.demo.Dto.AdminApp;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

import com.reactive.demo.Dto.CustomerApp.OrderDetailItemDto;

@Data
@Builder
public class AdminOrderDetailResponseDto {
    private String orderId;
    private String status;
    private Double totalAmount;
    private String deliveryAddress;
    private String shippingPhone; 
    private String paymentImg;
    private LocalDateTime createdAt;
    
    private OrderCustomerInfoDto customer;
    private List<OrderRestaurantInfoDto> restaurants;
    private OrderRiderInfoDto rider;
    private List<OrderDetailItemDto> items;
}
