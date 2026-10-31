package com.reactive.demo.Dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateEmailRequestDto {

    @Email(message = "Invalid email format")
    @NotBlank(message = "New email is required")
    private String newEmail;
}
