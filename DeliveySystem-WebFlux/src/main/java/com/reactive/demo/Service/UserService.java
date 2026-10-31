package com.reactive.demo.Service;

import com.reactive.demo.Dto.CustomerApp.UpdateUserRequestDto;
import com.reactive.demo.Dto.CustomerApp.UserInfoDto;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface UserService {
    
    // READ ALL
    Flux<UserInfoDto> getAllCustomers();

    // READ ONE
    Mono<UserInfoDto> getUserById(String userId);

    // UPDATE
    Mono<UserInfoDto> updateUserProfile(String userId, UpdateUserRequestDto request);

    // DELETE
    Mono<Boolean> deleteUser(String userId);
}
