package com.reactive.demo.Service;

import reactor.core.publisher.Mono;

public interface LocationService {
    
    Mono<Long> updateRiderLocation(String riderId, double longitude, double latitude, String status);
    
    // Removes the rider from the live map (e.g., when they log off)
    Mono<Long> removeRiderLocation(String riderId);
}
