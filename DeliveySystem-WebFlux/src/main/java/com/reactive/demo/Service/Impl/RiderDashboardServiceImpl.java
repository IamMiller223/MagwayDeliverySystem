package com.reactive.demo.Service.Impl;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.stereotype.Service;

import com.reactive.demo.Dto.CustomerApp.OrderResponseDto;
import com.reactive.demo.Dto.Exception.ResourceNotFoundException;
import com.reactive.demo.Dto.RiderApp.DashboardStatsDto;
import com.reactive.demo.Dto.RiderApp.JobSpecificationDto;
import com.reactive.demo.Dto.RiderApp.TaskCardDto;
import com.reactive.demo.Model.Order;
import com.reactive.demo.Model.Restaurant;
import com.reactive.demo.Model.User;
import com.reactive.demo.Repository.OrderRepository;
import com.reactive.demo.Repository.RestaurantRepository;
import com.reactive.demo.Repository.UserRepository;
import com.reactive.demo.Service.RiderDashboardService;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class RiderDashboardServiceImpl implements RiderDashboardService{
	
	@Autowired
	OrderRepository orderRepository;
	
	@Autowired 
	UserRepository userRepository;
	
	@Autowired
	RestaurantRepository restaurantRepository;
	
	@Autowired
	 private ReactiveRedisTemplate<String, String> redisTemplate;
	
	
	// --- 1. DASHBOARD STATS (Concurrent execution) ---
	@Override
    public Mono<DashboardStatsDto> getDashboardStats(String riderId) {
        Mono<Long> activeCount = orderRepository.countByRiderIdAndStatusIn(riderId, List.of("PREPARING", "OUT_FOR_DELIVERY"));
        Mono<Long> completedCount = orderRepository.countByRiderIdAndStatus(riderId, "DELIVERED");

        // Executes both DB calls at the exact same time and zips the result
        return Mono.zip(activeCount, completedCount)
                .map(tuple -> DashboardStatsDto.builder()
                        .activeCount(tuple.getT1())
                        .completedCount(tuple.getT2())
                        .build());
    }
	
	// --- 2. TASK LISTS ---
	@Override
    public Flux<TaskCardDto> getTasks(String riderId, boolean isActive) {
        Flux<Order> orderFlux = isActive 
            ? orderRepository.findByRiderIdAndStatusIn(riderId, List.of("PREPARING", "OUT_FOR_DELIVERY"))
            : orderRepository.findByRiderIdAndStatus(riderId, "DELIVERED");

        return orderFlux.flatMap(order -> 
            userRepository.findById(order.getCustomerId())
                .map(customer -> TaskCardDto.builder()
                        .orderId(order.getId())
                        .status(order.getStatus())
                        .deliveryAddress(order.getDeliveryLocation().getAddress())
                        .customerName(customer.getName())
                        .itemCount(order.getItems().stream().mapToInt(i -> i.getQuantity()).sum())
                        .totalAmount(order.getTotalAmount())
                        .createdAt(order.getCreatedAt())
                        .build())
        );
    }
	
	// --- 3. JOB SPECIFICATION (Detailed Route View) ---
    public Mono<JobSpecificationDto> getJobDetails(String orderId) {
        return orderRepository.findById(orderId)
                .flatMap(order -> {
                    
                    Mono<User> customerMono = userRepository.findById(order.getCustomerId());
                    Mono<List<Restaurant>> restaurantsMono = restaurantRepository.findAllById(order.getRestaurantsId()).collectList();

                    return Mono.zip(customerMono, restaurantsMono)
                            .map(tuple -> {
                                User customer = tuple.getT1();
                                List<Restaurant> restaurants = tuple.getT2();

                                // 1. Map ALL restaurants into a list of individual Pickup locations
                                List<JobSpecificationDto.PickupDto> pickupLocations = restaurants.stream()
                                        .map(restaurant -> {
                                            double lat = 0.0;
                                            double lon = 0.0;
                                            if (restaurant.getLocation() != null && restaurant.getLocation().getCoordinates() != null) {
                                                lon = restaurant.getLocation().getCoordinates().get(0);
                                                lat = restaurant.getLocation().getCoordinates().get(1);
                                            }
                                            
                                            return JobSpecificationDto.PickupDto.builder()
                                                    .restaurantName(restaurant.getName())
                                                    .address(restaurant.getAddress())
                                                    .latitude(lat)
                                                    .longitude(lon)
                                                    .build();
                                        })
                                        .toList();

                                // 2. Extract Shipping Phone
                                String shippingPhone = (order.getDeliveryLocation() != null && order.getDeliveryLocation().getPhone() != null)
                                        ? order.getDeliveryLocation().getPhone()
                                        : customer.getPhone();

                                // 3. Map the receipt items AND calculate the food total
                                double itemsTotal = 0.0;
                                List<JobSpecificationDto.ReceiptItemDto> receiptItems = new ArrayList<>();
                                
                                for (var item : order.getItems()) {
                                    double itemCost = item.getPriceAtPurchase() * item.getQuantity();
                                    itemsTotal += itemCost; 
                                    
                                    receiptItems.add(JobSpecificationDto.ReceiptItemDto.builder()
                                            .name(item.getName())
                                            .quantity(item.getQuantity())
                                            .price(itemCost)
                                            .build());
                                }

                                // 4. --- NEW: RECALCULATE DISTANCE & STOPS FOR THE RIDER ---
                                double totalDistanceKm = 0.0;
                                for (Restaurant restaurant : restaurants) {
                                    if (restaurant.getLocation() != null && restaurant.getLocation().getCoordinates() != null) {
                                        double restLon = restaurant.getLocation().getCoordinates().get(0);
                                        double restLat = restaurant.getLocation().getCoordinates().get(1);

                                        totalDistanceKm += calculateDistance(
                                                order.getDeliveryLocation().getLatitude(), 
                                                order.getDeliveryLocation().getLongitude(),
                                                restLat, restLon
                                        );
                                    }
                                }
                                
                                double formattedDistance = Math.round(totalDistanceKm * 10.0) / 10.0;
                                int extraStops = restaurants.size() > 1 ? restaurants.size() - 1 : 0;

                                // 5. Deduce the exact delivery fee (Includes the ceiling rounding difference)
                                double deliveryFee = order.getTotalAmount() - itemsTotal;

                                return JobSpecificationDto.builder()
                                        .orderId(order.getId())
                                        .status(order.getStatus())
                                        .createdAt(order.getCreatedAt())
                                        .pickupLocations(pickupLocations) 
                                        .deliveryDestinationAddress(order.getDeliveryLocation().getAddress())
                                        .recipient(JobSpecificationDto.RecipientDto.builder()
                                                .name(customer.getName())
                                                .phone(shippingPhone) 
                                                .latitude(order.getDeliveryLocation().getLatitude())
                                                .longitude(order.getDeliveryLocation().getLongitude())
                                                .image(customer.getImage()) 
                                                .build())
                                        .receiptSummary(receiptItems)
                                        .itemsTotal(itemsTotal)                 // Added Food Total
                                        .deliveryFee(deliveryFee)               // Added Exact Delivery Fee
                                        .totalDistanceKm(formattedDistance)     // Added Total Distance
                                        .extraStops(extraStops)                 // Added Surcharge Stops
                                        .totalCashCollect(order.getTotalAmount())
                                        .build();
                            });
                });
    }
    
    @Override
    public Mono<OrderResponseDto> completeDelivery(String orderId, String riderId) {
        
        return orderRepository.findById(orderId)
                .switchIfEmpty(Mono.error(new ResourceNotFoundException("Order not found!")))
                .flatMap(order -> {
                    
                    // 1. Safety Check: Ensure it is currently out for delivery
                    if (!"OUT_FOR_DELIVERY".equalsIgnoreCase(order.getStatus())) {
                        return Mono.error(new RuntimeException("Cannot complete delivery: Order is currently " + order.getStatus()));
                    }
                    
                    // 2. Safety Check: Ensure the rider completing it is the one assigned!
                    if (order.getRiderId() == null || !order.getRiderId().equals(riderId)) {
                        return Mono.error(new RuntimeException("Unauthorized: You are not assigned to this order!"));
                    }

                    // 3. Update Order Status
                    order.setStatus("DELIVERED");

                    // 4. Update the Rider's status back to AVAILABLE
                    return userRepository.findById(riderId)
                            .flatMap(rider -> {
                                rider.setStatus("AVAILABLE");
                                return userRepository.save(rider);
                            })
                            .then(Mono.defer(() -> {
                                // 5. Add Rider back to the Redis Available Pool
                                redisTemplate.opsForZSet().add("riders:AVAILABLE", riderId, System.currentTimeMillis()).subscribe();
                                
                                // 6. Save the completed order
                                return orderRepository.save(order);
                            }));
                })
                .map(savedOrder -> OrderResponseDto.builder()
                        .orderId(savedOrder.getId())
                        .status(savedOrder.getStatus())
                        .riderId(savedOrder.getRiderId())
                        .build());
    }
    
    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371;
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

}
