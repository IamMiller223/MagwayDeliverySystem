package com.reactive.demo.Service.Impl;

import com.reactive.demo.Service.LocationService;
import org.springframework.data.geo.Point;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
public class LocationServiceImpl implements LocationService {

    private final ReactiveRedisTemplate<String, String> redisTemplate;
    
    // The key for our invisible Redis map
    private static final String ACTIVE_RIDERS_KEY = "active_riders";

    public LocationServiceImpl(ReactiveRedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public Mono<Long> updateRiderLocation(String riderId, double longitude, double latitude, String status) {
        String availableKey = "riders:AVAILABLE";
        String busyKey = "riders:BUSY";

        // 1. Remove the rider from both maps to prevent ghost duplicates when they change status
        Mono<Long> removeAvailable = redisTemplate.opsForZSet().remove(availableKey, riderId);
        Mono<Long> removeBusy = redisTemplate.opsForZSet().remove(busyKey, riderId);

        // 2. Decide which map they belong on right now
        String targetKey = "AVAILABLE".equalsIgnoreCase(status) ? availableKey : busyKey;

        // 3. Execute removals, THEN add their fresh coordinates to the correct map
        return Mono.when(removeAvailable, removeBusy)
                .then(redisTemplate.opsForGeo().add(targetKey, new Point(longitude, latitude), riderId));
    }

    @Override
    public Mono<Long> removeRiderLocation(String riderId) {
        return redisTemplate.opsForZSet().remove(ACTIVE_RIDERS_KEY, riderId);
    }
}
