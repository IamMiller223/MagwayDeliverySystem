package com.reactive.demo.Dto.CustomerApp;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserInfoDto {
    private String userId;
    private String name;
    private String image;
    private String phone;
    private String email;
    private String role;
}
