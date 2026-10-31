package com.reactive.demo.Dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AdminOrderListDto {
    private String orderId;
    private Double totalAmount;
    private String status;
    private String customerName;
}
