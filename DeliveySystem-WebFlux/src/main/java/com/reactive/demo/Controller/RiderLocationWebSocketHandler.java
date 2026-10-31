package com.reactive.demo.Controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.reactive.demo.Dto.AdminApp.LocationUpdateDto;
import com.reactive.demo.Service.LocationService;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.WebSocketMessage;
import org.springframework.web.reactive.socket.WebSocketSession;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;

@Component
public class RiderLocationWebSocketHandler implements WebSocketHandler {

    private final LocationService locationService;
    private final ObjectMapper objectMapper;
    
    // The shared broadcaster that relays messages to all connected sessions
    private final Sinks.Many<String> broadcastSink = Sinks.many().multicast().directBestEffort();

    public RiderLocationWebSocketHandler(LocationService locationService, ObjectMapper objectMapper) {
        this.locationService = locationService;
        this.objectMapper = objectMapper;
    }

    @Override
    public Mono<Void> handle(WebSocketSession session) {
        
        System.out.println("🟢 New WebSocket connection established: " + session.getId());
        
        // 1. INPUT STREAM: Read from the rider, update the DB, and broadcast
        Mono<Void> input = session.receive()
                .map(WebSocketMessage::getPayloadAsText)
                .flatMap(payload -> {
                    try {
                        LocationUpdateDto dto = objectMapper.readValue(payload, LocationUpdateDto.class);
                        
                        System.out.println("📍 GPS Received for Rider: " + dto.getRiderId() + 
                                           " [" + dto.getLatitude() + ", " + dto.getLongitude() + "]");
                        
                        // Update your backend service first
                        return locationService.updateRiderLocation(
                                dto.getRiderId(), 
                                dto.getLongitude(), 
                                dto.getLatitude(),
                                dto.getStatus() 
                        ).doOnSuccess(unused -> {
                            // Once the service updates successfully, broadcast the JSON to everyone!
                            broadcastSink.tryEmitNext(payload);
                        });
                        
                    } catch (Exception e) {
                        System.err.println("Invalid WebSocket message received: " + payload);
                        return Mono.empty(); 
                    }
                })
                .then(); 

        // 2. OUTPUT STREAM: Listen to the broadcaster and push data to the frontend
        Mono<Void> output = session.send(
                broadcastSink.asFlux().map(session::textMessage)
        );

        // 3. EXECUTE BOTH: Keep the tunnel open for sending and receiving simultaneously
        return Mono.zip(input, output)
                .doFinally(signalType -> System.out.println("🔴 WebSocket closed: " + session.getId()))
                .then(); 
    }
}