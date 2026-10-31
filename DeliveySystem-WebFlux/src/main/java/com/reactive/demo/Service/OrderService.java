package com.reactive.demo.Service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.http.ResponseEntity;

import com.reactive.demo.Dto.AdminOrderListDto;
import com.reactive.demo.Dto.RestResponse;
import com.reactive.demo.Dto.AdminApp.AdminOrderDetailResponseDto;
import com.reactive.demo.Dto.AdminApp.RiderListResponseDto;
import com.reactive.demo.Dto.CustomerApp.CalculateFeeRequestDto;
import com.reactive.demo.Dto.CustomerApp.DeliveryFeeResponseDto;
import com.reactive.demo.Dto.CustomerApp.OrderCustomerLocationDto;
import com.reactive.demo.Dto.CustomerApp.OrderDetailResponseDto;
import com.reactive.demo.Dto.CustomerApp.OrderRequestDto;
import com.reactive.demo.Dto.CustomerApp.OrderRequestV2Dto;
import com.reactive.demo.Dto.CustomerApp.OrderResponseDto;
import com.reactive.demo.Dto.CustomerApp.UserOrderHistoryDto;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface OrderService {
	
	Mono<OrderResponseDto> createOrder(OrderRequestDto request);
	
	Mono<OrderResponseDto> createOrderV2(OrderRequestV2Dto request);

	Mono<OrderDetailResponseDto> getOrderDetails(String orderId);
	
	 Flux<UserOrderHistoryDto> getUserOrders(String userId);
	 

	Mono<RiderListResponseDto> getNearestAvailableRider(String orderId);
	
	// --- ADD THIS NEW METHOD FOR ADMIN ---
    Mono<OrderResponseDto> adminAcceptOrder(String orderId);
    
    Mono<OrderResponseDto> adminRejectOrder(String orderId);

    Mono<OrderResponseDto> assignRiderToOrder(String orderId, String riderId);

    Mono<OrderResponseDto> acceptOrder(String orderId, String riderId);
    
 // --- ADD THIS NEW ADMIN METHOD ---
    Mono<AdminOrderDetailResponseDto> getAdminOrderDetails(String orderId);

	Mono<DeliveryFeeResponseDto> calculateDeliveryFee(CalculateFeeRequestDto request);

	Mono<List<AdminOrderListDto>> getAllOrders(int page, int size, LocalDate from, LocalDate to);

	Flux<OrderCustomerLocationDto> getOrderCustomerLocations(String status);
	
	Mono<OrderCustomerLocationDto> getOrderCustomerLocationById(String orderId);
	
	Mono<List<AdminOrderListDto>> getOrdersByDate(LocalDate date);



	
    
    
	

}
