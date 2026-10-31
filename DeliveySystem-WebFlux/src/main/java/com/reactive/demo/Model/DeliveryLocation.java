package com.reactive.demo.Model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryLocation {
    private String address;
    private Double latitude;
    private Double longitude;
    private String phone;
}
