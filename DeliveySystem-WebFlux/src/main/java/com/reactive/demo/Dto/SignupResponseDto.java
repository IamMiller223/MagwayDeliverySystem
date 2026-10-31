package com.reactive.demo.Dto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SignupResponseDto {
	private String userId;
    private String name;
    private String email;
    private String role;
}
