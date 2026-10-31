package com.reactive.demo.Controller;


import com.reactive.demo.Dto.CustomerApp.OrderResponseDto;
import com.reactive.demo.Dto.RiderApp.DashboardStatsDto;
import com.reactive.demo.Dto.RiderApp.JobSpecificationDto;
import com.reactive.demo.Dto.RiderApp.TaskCardDto;
import com.reactive.demo.Service.RiderDashboardService;
import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/rider")
@RequiredArgsConstructor
public class RiderDashboardController {

   @Autowired
   RiderDashboardService dashboardService;

    // 1. Get top widget stats
    @GetMapping("/{riderId}/stats")
    public Mono<DashboardStatsDto> getStats(@PathVariable String riderId) {
        return dashboardService.getDashboardStats(riderId);
    }

    // 2. Get task lists (Query param ?type=active or ?type=completed)
    @GetMapping("/{riderId}/tasks")
    public Flux<TaskCardDto> getTasks(
            @PathVariable String riderId,
            @RequestParam(defaultValue = "active") String type) {
        
        boolean isActive = type.equalsIgnoreCase("active");
        return dashboardService.getTasks(riderId, isActive);
    }

    // 3. Get detailed job specification for the map screen
    @GetMapping("/order/{orderId}/details")
    public Mono<JobSpecificationDto> getOrderDetails(@PathVariable String orderId) {
        return dashboardService.getJobDetails(orderId);
    }
    
    @PutMapping("/{riderId}/order/{orderId}/complete")
    public Mono<OrderResponseDto> completeDelivery(
            @PathVariable String riderId, 
            @PathVariable String orderId) {
            
        
        return dashboardService.completeDelivery(orderId, riderId);
    }
}
