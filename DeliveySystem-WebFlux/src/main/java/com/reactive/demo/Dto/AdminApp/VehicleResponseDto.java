package com.reactive.demo.Dto.AdminApp;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class VehicleResponseDto {
    private String id;
    private String riderId;
    private String type;
    private String licenceNumber;
    private LocalDateTime createdAt;
}
