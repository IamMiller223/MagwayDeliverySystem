package com.reactive.demo.Dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdatePasswordRequestDto {

    @NotBlank(message = "Current password is required to prove your identity")
    private String oldPassword;

    @Size(min = 6, message = "New password must be at least 6 characters")
    @NotBlank(message = "New password is required")
    private String newPassword;
}
