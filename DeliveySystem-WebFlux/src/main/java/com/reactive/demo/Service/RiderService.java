package com.reactive.demo.Service;

import com.reactive.demo.Dto.AdminApp.RiderListResponseDto;
import com.reactive.demo.Dto.AdminApp.UpdateRiderRequestDto;
import com.reactive.demo.Dto.AdminApp.UpdateRiderResponseDto;
import com.reactive.demo.Dto.AdminApp.UpdateVehicleRequestDto;
import com.reactive.demo.Dto.AdminApp.VehicleResponseDto;
import com.reactive.demo.Dto.RiderApp.FullRiderProfileDto;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface RiderService {

	Flux<RiderListResponseDto> getAllRiders();

	Mono<Boolean> deleteRider(String riderId);

	Mono<VehicleResponseDto> updateRiderVehicle(String riderId, UpdateVehicleRequestDto request);

	Mono<UpdateRiderResponseDto> updateRiderProfile(String riderId, UpdateRiderRequestDto request);

	Mono<FullRiderProfileDto> getFullRiderProfile(String riderId);

}
