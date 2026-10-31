package com.reactive.demo.Dto.CustomerApp;


import com.reactive.demo.Model.DeliveryLocation;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class OrderCustomerLocationDto {
    private String orderId;
    private String customerId;
    private String customerImage;
    private DeliveryLocation deliveryLocation;
}
