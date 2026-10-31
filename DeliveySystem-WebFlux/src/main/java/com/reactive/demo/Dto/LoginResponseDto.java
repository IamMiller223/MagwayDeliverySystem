package com.reactive.demo.Dto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class LoginResponseDto {
	private String userId;
    private String name;
    private String role;
    private String token;
    private String img;
}
