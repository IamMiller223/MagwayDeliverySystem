package com.reactive.demo.Controller;


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
import com.reactive.demo.Service.OrderService;
import com.reactive.demo.Utils.ResponseUtils;

import jakarta.validation.Valid;

import java.time.LocalDate;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @Autowired
    OrderService orderService;

    @PreAuthorize("hasRole('CUSTOMER')")
    @PostMapping("/save-order")
    public Mono<ResponseEntity<RestResponse<OrderResponseDto>>> saveOrder(@RequestBody OrderRequestDto request) {
        return this.orderService.createOrder(request)
                .flatMap(response -> ResponseUtils.success(
                        HttpStatus.CREATED, 
                        "Order placed successfully",
                        response
                ));
    }
    
    @PostMapping("/v2/create")
    public Mono<ResponseEntity<RestResponse<OrderResponseDto>>> createOrderV2(
            @Valid @RequestBody OrderRequestV2Dto request) {
            
        return orderService.createOrderV2(request)
                .flatMap(order -> ResponseUtils.success(
                        HttpStatus.CREATED, 
                        "Order with payment proof created successfully", 
                        order
                ));
    }
    
    @PreAuthorize("hasRole('CUSTOMER')")
    @GetMapping("/getOrderDetails/{orderId}")
    public Mono<ResponseEntity<RestResponse<OrderDetailResponseDto>>> getOrderDetails(@PathVariable String orderId) {
        return orderService.getOrderDetails(orderId)
                .flatMap(response -> ResponseUtils.success(
                        HttpStatus.OK, 
                        "Order details fetched",
                        response
                ));
    }
    
    @GetMapping("/getUserOrders/{userId}")
    public Mono<ResponseEntity<RestResponse<List<UserOrderHistoryDto>>>> getUserOrders(@PathVariable String userId) {
        return orderService.getUserOrders(userId)
                .collectList()
                .flatMap(orders -> ResponseUtils.success(
                        HttpStatus.OK, 
                        "User orders history retrieved",
                        orders
                ));
    }
    
    @GetMapping
    public Mono<ResponseEntity<RestResponse<List<AdminOrderListDto>>>> getAllOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
            
        return this.orderService.getAllOrders(page, size, from, to)
                .flatMap(orders -> ResponseUtils.success(
                        HttpStatus.OK, 
                        "System orders retrieved", 
                        orders
                ));
    }
    
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/{orderId}/nearest-rider")
    public Mono<ResponseEntity<RestResponse<RiderListResponseDto>>> getNearestRider(@PathVariable String orderId) {
        return orderService.getNearestAvailableRider(orderId)
                .flatMap(rider -> ResponseUtils.success(
                        HttpStatus.OK, 
                        "Successfully found the closest available rider",
                        rider
                ));
    }
    
    
 // --- ADD THIS NEW ADMIN ACCEPT ENDPOINT ---
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{orderId}/admin-accept")
    public Mono<ResponseEntity<RestResponse<OrderResponseDto>>> adminAcceptOrder(@PathVariable String orderId) {
        
        return orderService.adminAcceptOrder(orderId)
                .flatMap(response -> ResponseUtils.success(
                        HttpStatus.OK, 
                        "Admin successfully accepted the order (Status: PREPARING)",
                        response
                ));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{orderId}/assign/{riderId}")
    public Mono<ResponseEntity<RestResponse<OrderResponseDto>>> assignRider(
            @PathVariable String orderId, 
            @PathVariable String riderId) {
        
        return orderService.assignRiderToOrder(orderId, riderId)
                .flatMap(response -> ResponseUtils.success(
                        HttpStatus.OK, 
                        "Rider successfully assigned to order",
                        response
                ));
    }

    // --- ADD THIS NEW ENDPOINT FOR THE RIDER ---
    @PreAuthorize("hasRole('RIDER')")
    @PutMapping("/{orderId}/accept/{riderId}")
    public Mono<ResponseEntity<RestResponse<OrderResponseDto>>> acceptOrder(
            @PathVariable String orderId, 
            @PathVariable String riderId) {
        
        return orderService.acceptOrder(orderId, riderId)
                .flatMap(response -> ResponseUtils.success(
                        HttpStatus.OK, 
                        "Order successfully accepted",
                        response
                ));
    }
    
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{orderId}/admin-reject")
    public Mono<ResponseEntity<RestResponse<OrderResponseDto>>> adminRejectOrder(@PathVariable String orderId) {
        return orderService.adminRejectOrder(orderId)
                .flatMap(response -> ResponseUtils.success(
                        HttpStatus.OK, 
                        "Order rejected/cancelled successfully",
                        response
                ));
    }
    
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin/order-details/{orderId}")
    public Mono<ResponseEntity<RestResponse<AdminOrderDetailResponseDto>>> getAdminOrderDetails(@PathVariable String orderId) {
        return orderService.getAdminOrderDetails(orderId)
                .flatMap(response -> ResponseUtils.success(
                        HttpStatus.OK, 
                        "Admin order details fetched successfully",
                        response
                ));
    }
    
    @PostMapping("/calculate-fee")
    public Mono<ResponseEntity<RestResponse<DeliveryFeeResponseDto>>> calculateFee(@RequestBody CalculateFeeRequestDto request) {
        
        return orderService.calculateDeliveryFee(request)
                .flatMap(feeDto -> ResponseUtils.success(
                        HttpStatus.OK, 
                        "Delivery fee calculated successfully", 
                        feeDto
                ));
    }
    
    @GetMapping("/customer-locations")
    @PreAuthorize("hasRole('CUSTOMER')") 
    public Mono<ResponseEntity<RestResponse<List<OrderCustomerLocationDto>>>> getCustomerLocations(
            @RequestParam(required = false) String status) {
        
        return this.orderService.getOrderCustomerLocations(status)
                .collectList() 
                // 👇 CHANGE THIS TO .flatMap
                .flatMap(data -> ResponseUtils.success(
                        HttpStatus.OK, 
                        "Order customer locations retrieved successfully", 
                        data
                ));
    }
    
    
    @GetMapping("/{orderId}/customer-location")
    @PreAuthorize("hasAnyRole('ADMIN', 'RIDER','CUSTOMER')") // Allowed for both Admin and Rider
    public Mono<ResponseEntity<RestResponse<OrderCustomerLocationDto>>> getCustomerLocationByOrderId(
            @PathVariable String orderId) {
        
        return this.orderService.getOrderCustomerLocationById(orderId)
                .flatMap(data -> ResponseUtils.success(
                        HttpStatus.OK, 
                        "Customer location for order retrieved successfully", 
                        data
                ));
    }
    
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/by-date")
    public Mono<ResponseEntity<RestResponse<List<AdminOrderListDto>>>> getOrdersByDate(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
            
        return this.orderService.getOrdersByDate(date)
                .flatMap(orders -> ResponseUtils.success(
                        HttpStatus.OK, 
                        "Orders retrieved successfully for requested date", 
                        orders
                ));
    }
    

}
