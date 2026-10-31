package com.reactive.demo.Dto.AdminApp;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UpdateRiderResponseDto {
    private String riderId;
    private String image;
    private String name;
    private String phone;
    private String email;
    
    // Add the NRC Number to the response
    private String nrcNumber;
}
