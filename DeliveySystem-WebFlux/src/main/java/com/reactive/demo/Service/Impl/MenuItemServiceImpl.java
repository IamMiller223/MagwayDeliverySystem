package com.reactive.demo.Service.Impl;

import com.reactive.demo.Dto.AdminApp.CreateMenuItemRequestDto;
import com.reactive.demo.Dto.AdminApp.MenuItemCreateDto;
import com.reactive.demo.Dto.AdminApp.UpdateMenuItemRequestDto;
import com.reactive.demo.Dto.CustomerApp.MenuItemResponseDto;
import com.reactive.demo.Dto.CustomerApp.RestaurantMenuWrapperDto;
import com.reactive.demo.Dto.Exception.ResourceNotFoundException;
import com.reactive.demo.Model.MenuItem;
import com.reactive.demo.Repository.RestaurantRepository;
import com.reactive.demo.Service.MenuItemService;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class MenuItemServiceImpl implements MenuItemService {

    private final RestaurantRepository restaurantRepository;

    public MenuItemServiceImpl(RestaurantRepository restaurantRepository) {
        this.restaurantRepository = restaurantRepository;
    }

    @Override
    public Mono<RestaurantMenuWrapperDto> getMenuByRestaurantId(String restaurantId, int page, int size) {
        return restaurantRepository.findById(restaurantId)
                .switchIfEmpty(Mono.error(new ResourceNotFoundException("Restaurant not found!")))
                .map(restaurant -> {
                    
                    List<MenuItem> allItems = restaurant.getMenuItems() != null ? restaurant.getMenuItems() : new ArrayList<>();
                    
                    List<MenuItemResponseDto> paginatedItems = allItems.stream()
                            .skip((long) page * size)
                            .limit(size)
                            .map(item -> mapToDto(item, restaurantId)) 
                            .collect(java.util.stream.Collectors.toList());
                            
                    return RestaurantMenuWrapperDto.builder()
                            .restaurantImg(restaurant.getImage()) 
                            .menuItems(paginatedItems)
                            .build();
                });
    }

    @Override
    public Mono<MenuItemResponseDto> createMenuItem(String restaurantId, CreateMenuItemRequestDto request) {
        return restaurantRepository.findById(restaurantId)
                .switchIfEmpty(Mono.error(new ResourceNotFoundException("Cannot add menu item: Restaurant not found!")))
                .flatMap(restaurant -> {
                    
                    // Initialize the array if this is the very first item!
                    if (restaurant.getMenuItems() == null) {
                        restaurant.setMenuItems(new ArrayList<>());
                    }

                    MenuItem item = MenuItem.builder()
                            .id(UUID.randomUUID().toString()) 
                            .name(request.getName())
                            .description(request.getDescription())
                            .image(request.getImage())
                            .category(request.getCategory())
                            .price(request.getPrice())
                            .isAvailable(request.getIsAvailable())
                            .build();

                    // Add it to the embedded array
                    restaurant.getMenuItems().add(item);

                    // Save and instantly map it to the DTO using all 3 arguments
                    return restaurantRepository.save(restaurant)
                            .thenReturn(mapToDto(item, restaurantId));
                });
    }

    @Override
    public Mono<MenuItemResponseDto> updateMenuItem(String restaurantId, String menuItemId, UpdateMenuItemRequestDto request) {
        return restaurantRepository.findById(restaurantId)
                .switchIfEmpty(Mono.error(new ResourceNotFoundException("Restaurant not found!")))
                .flatMap(restaurant -> {
                    
                    if (restaurant.getMenuItems() == null) {
                        return Mono.error(new ResourceNotFoundException("Menu item not found!"));
                    }

                    // Find the specific item in the embedded array
                    MenuItem existingItem = restaurant.getMenuItems().stream()
                            .filter(item -> item.getId() != null && item.getId().equals(menuItemId))
                            .findFirst()
                            .orElse(null);

                    if (existingItem == null) {
                        return Mono.error(new ResourceNotFoundException("Menu item not found!"));
                    }

                    // Update fields if provided
                    if (request.getName() != null) existingItem.setName(request.getName());
                    if (request.getDescription() != null) existingItem.setDescription(request.getDescription());
                    if (request.getImage() != null) existingItem.setImage(request.getImage());
                    if (request.getCategory() != null) existingItem.setCategory(request.getCategory());
                    if (request.getPrice() != null) existingItem.setPrice(request.getPrice());
                    if (request.getIsAvailable() != null) existingItem.setIsAvailable(request.getIsAvailable());

                    // Save and instantly map it to the DTO using all 3 arguments
                    return restaurantRepository.save(restaurant)
                            .thenReturn(mapToDto(existingItem, restaurantId)); 
                });
    }

    @Override
    public Mono<Boolean> deleteMenuItem(String restaurantId, String menuItemId) {
        return restaurantRepository.findById(restaurantId)
                .switchIfEmpty(Mono.error(new ResourceNotFoundException("Restaurant not found!")))
                .flatMap(restaurant -> {
                    
                    if (restaurant.getMenuItems() == null) {
                        return Mono.error(new ResourceNotFoundException("Menu item not found!"));
                    }

                    // removeIf scans the array and deletes the matching item natively
                    // --- FIX 3: ADD NULL SAFETY CHECK ---
                    boolean removed = restaurant.getMenuItems().removeIf(item -> item.getId() != null && item.getId().equals(menuItemId));

                    if (!removed) {
                        return Mono.error(new ResourceNotFoundException("Menu item not found!"));
                    }

                    return restaurantRepository.save(restaurant).thenReturn(true);
                });
    }
    
    
 // Don't forget to import java.util.UUID!

    @Override
    public Mono<String> addManyMenuItems(String restaurantId, List<MenuItemCreateDto> newItems) {
        return restaurantRepository.findById(restaurantId)
                .switchIfEmpty(Mono.error(new ResourceNotFoundException("Restaurant not found with ID: " + restaurantId)))
                .flatMap(restaurant -> {
                    
                    // 1. Initialize the array if this is a brand new restaurant
                    if (restaurant.getMenuItems() == null) {
                        restaurant.setMenuItems(new ArrayList<>());
                    }

                    // 2. Map the DTOs to real MenuItem objects, generating secure UUIDs
                    List<MenuItem> mappedItems = newItems.stream()
                            .map(dto -> MenuItem.builder()
                                    .id(UUID.randomUUID().toString()) // <-- Backend generated ID!
                                    .name(dto.getName())
                                    .description(dto.getDescription())
                                    .image(dto.getImage())
                                    .category(dto.getCategory() != null ? dto.getCategory() : "General")
                                    .price(dto.getPrice())
                                    .isAvailable(dto.getIsAvailable() != null ? dto.getIsAvailable() : true)
                                    .build())
                            .toList();

                    // 3. Add all new items to the existing menu array
                    restaurant.getMenuItems().addAll(mappedItems);

                    // 4. Save the updated restaurant back to MongoDB
                    return restaurantRepository.save(restaurant);
                })
                .map(savedRestaurant -> "Successfully added " + newItems.size() + " menu items to " + savedRestaurant.getName());
    }

    private MenuItemResponseDto mapToDto(MenuItem item, String restaurantId) {
        return MenuItemResponseDto.builder()
                .id(item.getId())
                .restaurantId(restaurantId)
                .name(item.getName())
                .description(item.getDescription())
                .image(item.getImage())
                .category(item.getCategory())
                .price(item.getPrice())
                .isAvailable(item.getIsAvailable())
                .build();
    }

}
