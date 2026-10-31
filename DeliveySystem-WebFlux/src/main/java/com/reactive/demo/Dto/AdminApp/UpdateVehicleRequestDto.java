package com.reactive.demo.Dto.AdminApp;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateVehicleRequestDto {
    
    @NotBlank(message = "Vehicle type is required (e.g., Bike, Scooter, Car)")
    private String type;

    @NotBlank(message = "Licence number is required")
    private String licenceNumber;
}
