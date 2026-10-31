package com.reactive.demo.Controller;


import com.reactive.demo.Dto.RiderApp.LocationUpdateDto;
import com.reactive.demo.Service.Impl.TrackingServiceImpl;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/rider/tracking")
public class TrackingController {

    private final TrackingServiceImpl trackingService;

    public TrackingController(TrackingServiceImpl trackingService) {
        this.trackingService = trackingService;
    }

    // The Rider app calls this every 5 seconds
    @PostMapping("/update")
    @ResponseStatus(HttpStatus.ACCEPTED) // 202 Accepted: Fast response without waiting
    public Mono<Void> updateLocation(@RequestBody LocationUpdateDto location) {
        return trackingService.publishRiderLocation(location);
    }
    
    
  
}
