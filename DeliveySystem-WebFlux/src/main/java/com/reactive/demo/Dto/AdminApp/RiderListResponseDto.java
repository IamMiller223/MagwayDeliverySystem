package com.reactive.demo.Dto.AdminApp;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RiderListResponseDto {
    private String riderId;
    private String name;
    private String phone;
    private String status;
}
