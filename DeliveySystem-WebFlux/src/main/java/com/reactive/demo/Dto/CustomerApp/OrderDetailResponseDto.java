package com.reactive.demo.Dto.CustomerApp;



import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class OrderDetailResponseDto {
    private String orderId;
 // --- NEW FIELD ---
    private String riderId;
    private String status;
    private Double totalAmount;
    private String deliveryAddress;
    private List<OrderDetailItemDto> items;
}
