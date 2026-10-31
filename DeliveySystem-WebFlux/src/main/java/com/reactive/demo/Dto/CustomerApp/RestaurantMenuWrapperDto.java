package com.reactive.demo.Dto.CustomerApp;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class RestaurantMenuWrapperDto {
    private String restaurantImg; // <-- The single image field!
    private List<MenuItemResponseDto> menuItems; // <-- The paginated list!
}