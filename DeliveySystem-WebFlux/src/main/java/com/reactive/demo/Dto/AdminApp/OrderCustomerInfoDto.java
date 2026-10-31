package com.reactive.demo.Dto.AdminApp;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class OrderCustomerInfoDto {
    private String userId;
    private String name;
    private String phone;
    // Extracting the exact delivery coordinates from the Order
    private Double latitude; 
    private Double longitude; 
}
