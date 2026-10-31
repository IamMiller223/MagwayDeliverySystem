package com.reactive.demo.Repository;

import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.ReactiveMongoRepository;

import com.reactive.demo.Model.Restaurant;

import reactor.core.publisher.Flux;



public interface RestaurantRepository extends ReactiveMongoRepository<Restaurant, String> {
	
	 Flux<Restaurant> findAllBy(Pageable pageable);
	 Flux<Restaurant> findByNameContainingIgnoreCase(String name);

}
