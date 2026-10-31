package com.reactive.demo.Service.Impl;


import com.fasterxml.jackson.databind.ObjectMapper;
import com.reactive.demo.Dto.RiderApp.LocationUpdateDto;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.stereotype.Service;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class TrackingServiceImpl {

    // We use the Reactive template to keep the stream non-blocking!
    private final ReactiveRedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;

    public TrackingServiceImpl(ReactiveRedisTemplate<String, Object> redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    public Mono<Void> publishRiderLocation(LocationUpdateDto location) {
        // Create a unique Redis channel for this specific delivery
        String trackingChannel = "tracking:order:" + location.getOrderId();
        
        // Broadcast the location to anyone listening (the customer)
        return redisTemplate.convertAndSend(trackingChannel, location).then();
    }
    
    public Flux<LocationUpdateDto> subscribeToRiderLocation(String orderId) {
        String trackingChannel = "tracking:order:" + orderId;
        
        return redisTemplate.listenTo(ChannelTopic.of(trackingChannel))
                // 2. Safely convert the LinkedHashMap back into your exact DTO class!
                .map(message -> objectMapper.convertValue(message.getMessage(), LocationUpdateDto.class));
    }
}
