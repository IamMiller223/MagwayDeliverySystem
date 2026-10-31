package com.reactive.demo.Dto.RiderApp;


import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LocationUpdateDto {
    private String orderId;
    private String riderId;
    private double latitude;
    private double longitude;
}
