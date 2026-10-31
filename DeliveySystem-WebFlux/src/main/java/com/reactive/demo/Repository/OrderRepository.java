package com.reactive.demo.Repository;

import java.time.LocalDateTime;
import java.util.Collection;

import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.ReactiveMongoRepository;

import com.reactive.demo.Model.Order;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface OrderRepository extends ReactiveMongoRepository<Order, String>{
	
    Flux<Order> findByCustomerIdOrderByCreatedAtDesc(String customerId);
    Flux<Order> findAllByOrderByCreatedAtDesc();
    
 // --- ADD THIS INSIDE YOUR ORDER REPOSITORY INTERFACE ---
    Flux<Order> findByStatus(String status);
    
 // For the Active Tasks tab (Finding PREPARING or OUT_FOR_DELIVERY)
    Flux<Order> findByRiderIdAndStatusIn(String riderId, Collection<String> statuses);
    
    // For the Completed Tasks tab
    Flux<Order> findByRiderIdAndStatus(String riderId, String status);

    // For the Stats Widget (Optimized count queries)
    Mono<Long> countByRiderIdAndStatusIn(String riderId, Collection<String> statuses);
    Mono<Long> countByRiderIdAndStatus(String riderId, String status);
    
    Flux<Order> findAllBy(org.springframework.data.domain.Pageable pageable);
    
 // Add this inside your OrderRepository interface
    Flux<Order> findAllByCreatedAtBetween(LocalDateTime start, LocalDateTime end, Pageable pageable);
    
    Flux<Order> findAllByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
	

}
