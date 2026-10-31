package com.reactive.demo.Service;

import com.reactive.demo.Dto.AdminApp.CreateRestaurantRequestDto;
import com.reactive.demo.Dto.AdminApp.OrderRestaurantInfoDto;
import com.reactive.demo.Dto.AdminApp.UpdateRestaurantRequestDto;
import com.reactive.demo.Dto.CustomerApp.MenuItemResponseDto;
import com.reactive.demo.Dto.CustomerApp.RestaurantResponseDto;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface ResturantService {
	
	Flux<RestaurantResponseDto> getAllRestaurants(int page, int size);
	Flux<MenuItemResponseDto> getAllMenuForRestaurant(String restaurantId);
	Mono<RestaurantResponseDto> createRestaurant(CreateRestaurantRequestDto request);
	Mono<RestaurantResponseDto> getRestaurantById(String id);
	Mono<RestaurantResponseDto> updateRestaurant(String id, UpdateRestaurantRequestDto request);
	Mono<Boolean> deleteRestaurant(String id);
	Flux<OrderRestaurantInfoDto> searchRestaurantsByName(String query);

}
