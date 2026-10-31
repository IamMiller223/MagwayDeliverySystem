package com.reactive.demo.Service;

import java.util.List;

import com.reactive.demo.Dto.AdminApp.CreateMenuItemRequestDto;
import com.reactive.demo.Dto.AdminApp.MenuItemCreateDto;
import com.reactive.demo.Dto.AdminApp.UpdateMenuItemRequestDto;
import com.reactive.demo.Dto.CustomerApp.MenuItemResponseDto;
import com.reactive.demo.Dto.CustomerApp.RestaurantMenuWrapperDto;

import reactor.core.publisher.Mono;

public interface MenuItemService {
    
    Mono<MenuItemResponseDto> createMenuItem(String restaurantId, CreateMenuItemRequestDto request);
    
    Mono<MenuItemResponseDto> updateMenuItem(String restaurantId, String menuItemId, UpdateMenuItemRequestDto request);
    
    Mono<Boolean> deleteMenuItem(String restaurantId, String menuItemId);

	Mono<String> addManyMenuItems(String restaurantId, List<MenuItemCreateDto> newItems);

	Mono<RestaurantMenuWrapperDto> getMenuByRestaurantId(String restaurantId, int page, int size);
}
