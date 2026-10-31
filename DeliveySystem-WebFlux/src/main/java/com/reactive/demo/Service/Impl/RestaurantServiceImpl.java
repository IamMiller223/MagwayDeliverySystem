package com.reactive.demo.Service.Impl;

import java.util.Arrays;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.reactive.demo.Dto.AdminApp.CreateRestaurantRequestDto;
import com.reactive.demo.Dto.AdminApp.OrderRestaurantInfoDto;
import com.reactive.demo.Dto.AdminApp.UpdateRestaurantRequestDto;
import com.reactive.demo.Dto.CustomerApp.MenuItemResponseDto;
import com.reactive.demo.Dto.CustomerApp.RestaurantResponseDto;
import com.reactive.demo.Dto.Exception.ResourceNotFoundException;
import com.reactive.demo.Model.GeoLocation;
import com.reactive.demo.Model.Restaurant;
import com.reactive.demo.Repository.RestaurantRepository;
import com.reactive.demo.Service.ResturantService;
import com.reactive.demo.Utils.Mapper;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class RestaurantServiceImpl implements ResturantService{
	
	@Autowired
	RestaurantRepository restaurantRepo;
	
	@Autowired
	Mapper mapper;


	@Override
	public Flux<MenuItemResponseDto> getAllMenuForRestaurant(String restaurantId) {
		// TODO Auto-generated method stub
		return this.restaurantRepo.findById(restaurantId)
									.switchIfEmpty(Mono.error(new ResourceNotFoundException("No restaurant found with ID: " + restaurantId)))
									.flatMapMany(restaurant-> {
										if (restaurant.getMenuItems() == null || restaurant.getMenuItems().isEmpty()) {
					                        // If restaurant exists but has no menu, just return an empty list (200 OK)
					                        return Flux.empty(); 
					                    }
										return Flux.fromIterable(restaurant.getMenuItems());
									}).map(menuItem -> {
										MenuItemResponseDto dto = this.mapper.map(menuItem, MenuItemResponseDto.class);
										return dto;
									});
	}
	
	
	



	@Override
	public Flux<RestaurantResponseDto> getAllRestaurants(int page, int size) {
		// 1. Create a pagination request (Page numbers are 0-indexed in Spring)
        Pageable pageable = PageRequest.of(page, size);

        // 2. Use findAllBy(pageable) instead of the dangerous findAll()
        return this.restaurantRepo.findAllBy(pageable)
                .map(restaurant -> {
                    RestaurantResponseDto dto = this.mapper.map(restaurant, RestaurantResponseDto.class);
                    
                    dto.setRestaurantId(restaurant.getId());
                    
                    if (restaurant.getLocation() != null && restaurant.getLocation().getCoordinates() != null) {
                        List<Double> coords = restaurant.getLocation().getCoordinates();
                        if (coords.size() >= 2) {
                            dto.setLongitude(coords.get(0)); 
                            dto.setLatitude(coords.get(1));  
                        }
                    }
                    return dto;
                });
	}
	
	
	@Override
    public Mono<RestaurantResponseDto> createRestaurant(CreateRestaurantRequestDto request) {
        
        // Note: MongoDB requires [longitude, latitude] exactly in that order!
        GeoLocation location = GeoLocation.builder()
                .type("Point")
                .coordinates(Arrays.asList(request.getLongitude(), request.getLatitude()))
                .build();

        Restaurant restaurant = Restaurant.builder()
                .name(request.getName())
                // --- CHANGED THIS LINE ---
                .phone(request.getPhone()) 
                .image(request.getImage())
                .address(request.getAddress())
                .location(location)
                .build();

        return restaurantRepo.save(restaurant)
                .map(this::mapToDto);
    }

    @Override
    public Mono<RestaurantResponseDto> getRestaurantById(String id) {
        return restaurantRepo.findById(id)
                .switchIfEmpty(Mono.error(new ResourceNotFoundException("Restaurant not found!")))
                .map(this::mapToDto);
    }

    @Override
    public Mono<RestaurantResponseDto> updateRestaurant(String id, UpdateRestaurantRequestDto request) {
        return restaurantRepo.findById(id)
                .switchIfEmpty(Mono.error(new ResourceNotFoundException("Restaurant not found!")))
                .flatMap(existing -> {
                    // Only update the fields the Admin actually sent in the JSON payload
                    if (request.getName() != null) existing.setName(request.getName());
                    
                    // --- CHANGED THIS LINE ---
                    if (request.getPhone() != null) existing.setPhone(request.getPhone());
                    
                    if (request.getImage() != null) existing.setImage(request.getImage());
                    if (request.getAddress() != null) existing.setAddress(request.getAddress());
                    
                    // If GPS coords were provided, rebuild the location object
                    if (request.getLongitude() != null && request.getLatitude() != null) {
                        existing.setLocation(GeoLocation.builder()
                                .type("Point")
                                .coordinates(Arrays.asList(request.getLongitude(), request.getLatitude()))
                                .build());
                    }
                    
                    return restaurantRepo.save(existing);
                })
                .map(this::mapToDto);
    }

    @Override
    public Mono<Boolean> deleteRestaurant(String id) {
        return restaurantRepo.findById(id)
                .switchIfEmpty(Mono.error(new ResourceNotFoundException("Restaurant not found!")))
                // theReturn(true) fires only if the delete completes successfully
                .flatMap(restaurant -> restaurantRepo.delete(restaurant).thenReturn(true));
    }
	
	
	private RestaurantResponseDto mapToDto(Restaurant restaurant) {
        RestaurantResponseDto dto = this.mapper.map(restaurant, RestaurantResponseDto.class);
        dto.setRestaurantId(restaurant.getId());
        
        if (restaurant.getLocation() != null && restaurant.getLocation().getCoordinates() != null) {
            List<Double> coords = restaurant.getLocation().getCoordinates();
            if (coords.size() >= 2) {
                dto.setLongitude(coords.get(0)); 
                dto.setLatitude(coords.get(1));  
            }
        }
        return dto;
    }
	
	
	@Override
    public Flux<OrderRestaurantInfoDto> searchRestaurantsByName(String query) {
        
        // 1. Guard clause: instantly return empty if the search is blank
        if (query == null || query.trim().isEmpty()) {
            return Flux.empty(); 
        }

        // 2. Query MongoDB, but strictly limit to 20 to protect server memory
        return this.restaurantRepo.findByNameContainingIgnoreCase(query.trim())
                .take(10) // <-- THE PERFECT FIX 
                .map(r -> {
                    
                    // Safely extract coordinates if they exist
                    Double rLat = null;
                    Double rLng = null;
                    if (r.getLocation() != null && r.getLocation().getCoordinates() != null && r.getLocation().getCoordinates().size() >= 2) {
                        rLng = r.getLocation().getCoordinates().get(0); 
                        rLat = r.getLocation().getCoordinates().get(1); 
                    }
                    
                    // Map to your existing DTO
                    return OrderRestaurantInfoDto.builder()
                            .restaurantId(r.getId())
                            .name(r.getName())
                            .phone(r.getPhone())
                            .image(r.getImage())
                            .address(r.getAddress())
                            .latitude(rLat)
                            .longitude(rLng)
                            .build();
                });
    }
	



}
