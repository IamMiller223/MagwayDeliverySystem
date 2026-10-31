package com.reactive.demo.Controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.reactive.demo.Dto.RestResponse;
import com.reactive.demo.Dto.AdminApp.CreateMenuItemRequestDto;
import com.reactive.demo.Dto.AdminApp.CreateRestaurantRequestDto;
import com.reactive.demo.Dto.AdminApp.MenuItemCreateDto;
import com.reactive.demo.Dto.AdminApp.UpdateMenuItemRequestDto;
import com.reactive.demo.Dto.AdminApp.UpdateRestaurantRequestDto;
import com.reactive.demo.Dto.CustomerApp.MenuItemResponseDto;
import com.reactive.demo.Dto.CustomerApp.RestaurantMenuWrapperDto;
import com.reactive.demo.Dto.CustomerApp.RestaurantResponseDto;
import com.reactive.demo.Service.MenuItemService;
import com.reactive.demo.Service.ResturantService;
import com.reactive.demo.Utils.ResponseUtils;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/restaurants")
public class ResturantController {
	
	@Autowired
	ResturantService restaurantService;
	
	@Autowired
	MenuItemService menuItemService;
	
	@GetMapping
    public Mono<ResponseEntity<RestResponse<List<RestaurantResponseDto>>>> getAllRestaurants(
            // 2. Add @Min and @Max to protect your database!
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) int size 
    ) {
        return restaurantService.getAllRestaurants(page, size)
                .collectList()
                .flatMap(restaurantsList -> ResponseUtils.success(
                        HttpStatus.OK, 
                        "Restaurants fetched successfully", 
                        restaurantsList
                ));
    }
	
	@GetMapping("/{restaurantId}")
    public Mono<ResponseEntity<RestResponse<RestaurantMenuWrapperDto>>> getMenuOfSingleRestaurant(
            @PathVariable String restaurantId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
            
        return this.menuItemService.getMenuByRestaurantId(restaurantId, page, size)
                // Just map the wrapper directly into your success response!
                .flatMap(wrapper -> ResponseUtils.success(
                        HttpStatus.OK, 
                        "Menu fetched successfully", 
                        wrapper
                ));
    }
	
	
	@GetMapping("/getRestaurantByID/{id}")
    public Mono<ResponseEntity<RestResponse<RestaurantResponseDto>>> getRestaurantById(@PathVariable String id) {
        return restaurantService.getRestaurantById(id)
                .flatMap(restaurant -> ResponseUtils.success(
                        HttpStatus.OK, 
                        "Restaurant fetched successfully", 
                        restaurant
                ));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public Mono<ResponseEntity<RestResponse<RestaurantResponseDto>>> createRestaurant(
            @Valid @RequestBody CreateRestaurantRequestDto request) {
        
        return restaurantService.createRestaurant(request)
                .flatMap(restaurant -> ResponseUtils.success(
                        HttpStatus.CREATED, 
                        "Restaurant created successfully", 
                        restaurant
                ));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public Mono<ResponseEntity<RestResponse<RestaurantResponseDto>>> updateRestaurant(
            @PathVariable String id,
            @RequestBody UpdateRestaurantRequestDto request) {
        
        return restaurantService.updateRestaurant(id, request)
                .flatMap(restaurant -> ResponseUtils.success(
                        HttpStatus.OK, 
                        "Restaurant updated successfully", 
                        restaurant
                ));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public Mono<ResponseEntity<RestResponse<Boolean>>> deleteRestaurant(@PathVariable String id) {
        
        return restaurantService.deleteRestaurant(id)
                .flatMap(success -> ResponseUtils.success(
                        HttpStatus.OK, 
                        "Restaurant deleted successfully", 
                        success
                ));
    }
    


    // 2. ADMIN: Create Menu Item
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/{restaurantId}/menu")
    public Mono<ResponseEntity<RestResponse<MenuItemResponseDto>>> createMenuItem(
            @PathVariable String restaurantId,
            @Valid @RequestBody CreateMenuItemRequestDto request) {
        
        return menuItemService.createMenuItem(restaurantId, request)
                .flatMap(menuItem -> ResponseUtils.success(
                        HttpStatus.CREATED, 
                        "Menu item created successfully", 
                        menuItem
                ));
    }

    // 3. ADMIN: Update Menu Item
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{restaurantId}/menu/{menuItemId}")
    public Mono<ResponseEntity<RestResponse<MenuItemResponseDto>>> updateMenuItem(
            @PathVariable String restaurantId,
            @PathVariable String menuItemId,
            @RequestBody UpdateMenuItemRequestDto request) {
        
        return menuItemService.updateMenuItem(restaurantId, menuItemId, request)
                .flatMap(menuItem -> ResponseUtils.success(
                        HttpStatus.OK, 
                        "Menu item updated successfully", 
                        menuItem
                ));
    }

    // 4. ADMIN: Delete Menu Item
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{restaurantId}/menu/{menuItemId}")
    public Mono<ResponseEntity<RestResponse<Boolean>>> deleteMenuItem(
            @PathVariable String restaurantId,
            @PathVariable String menuItemId) {
        
        return menuItemService.deleteMenuItem(restaurantId, menuItemId)
                .flatMap(success -> ResponseUtils.success(
                        HttpStatus.OK, 
                        "Menu item deleted successfully", 
                        success
                ));
    }
    
    
    @PostMapping("/{restaurantId}/menu-items/bulk")
    public Mono<ResponseEntity<RestResponse<Object>>> addManyMenuItems(
            @PathVariable String restaurantId,
            @RequestBody @Valid List<MenuItemCreateDto> request) {

        return menuItemService.addManyMenuItems(restaurantId, request)
                // Use flatMap because ResponseUtils returns a Mono!
                .flatMap(message -> 
                        ResponseUtils.success(HttpStatus.CREATED, message, null)
                );
    }
    
    
    @GetMapping("/search")
    public Mono<ResponseEntity<RestResponse<Object>>> searchRestaurants(@RequestParam("query") String query) {
        
        return restaurantService.searchRestaurantsByName(query)
                .collectList() // This is now 100% safe because the Service limits it to 20 items max!
                .flatMap(restaurants -> {
                    if (restaurants.isEmpty()) {
                        return ResponseUtils.success(HttpStatus.OK, "No restaurants found with the name : " + query, restaurants);
                    }
                    return ResponseUtils.success(HttpStatus.OK, "Restaurants found", restaurants);
                });
    }
	
	
	

}
