package com.reactive.demo.Repository;

import org.springframework.data.mongodb.repository.ReactiveMongoRepository;

import com.reactive.demo.Model.Vehicle;

import reactor.core.publisher.Mono;

public interface VehicleRepository extends ReactiveMongoRepository<Vehicle, String> {
    
    // We need this to check if the rider already has a vehicle registered!
    Mono<Vehicle> findByRiderId(String riderId);
    Mono<Void> deleteByRiderId(String riderId);
   
}
