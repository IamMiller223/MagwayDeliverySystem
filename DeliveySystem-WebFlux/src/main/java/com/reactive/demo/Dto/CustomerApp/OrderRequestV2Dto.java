package com.reactive.demo.Dto.CustomerApp;

import lombok.Data;
import java.util.List;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;

@Data
public class OrderRequestV2Dto {
    @NotBlank
    private String customerId;
    
    @NotBlank
    private String deliveryAddress;
    @NotNull
    private Double latitude;
    @NotNull
    private Double longitude;
    @NotNull
    private List<OrderItemRequestDto> items;
    
    // --- THE BRAND NEW FIELDS ---
    @NotBlank(message = "Shipping phone number is required")
    private String shippingPhone; 
    
    @NotBlank(message = "Payment proof image is required")
    private String paymentImg; 
}
