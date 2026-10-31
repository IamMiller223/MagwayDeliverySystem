package com.reactive.demo.Dto.AdminApp;


import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateRiderRequestDto {
    
    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Phone is required")
    private String phone;

    @Email(message = "Invalid email format")
    @NotBlank(message = "Email is required")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;
    
    private String image;
    
    @NotBlank(message = "NRC Number is required for identity verification")
    private String nrcNumber;

    @NotBlank(message = "Vehicle type is required (e.g., Bike, Scooter, Car)")
    private String vehicleType;

    @NotBlank(message = "Licence number is required")
    private String licenceNumber;
}
