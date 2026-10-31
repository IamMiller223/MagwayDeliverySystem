package com.reactive.demo.Service;

import com.reactive.demo.Dto.CustomerApp.OrderResponseDto;
import com.reactive.demo.Dto.RiderApp.DashboardStatsDto;
import com.reactive.demo.Dto.RiderApp.JobSpecificationDto;
import com.reactive.demo.Dto.RiderApp.TaskCardDto;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface RiderDashboardService {

	Mono<DashboardStatsDto> getDashboardStats(String riderId);

	Flux<TaskCardDto> getTasks(String riderId, boolean isActive);

	Mono<OrderResponseDto> completeDelivery(String orderId, String riderId);

	Mono<JobSpecificationDto> getJobDetails(String orderId);

}