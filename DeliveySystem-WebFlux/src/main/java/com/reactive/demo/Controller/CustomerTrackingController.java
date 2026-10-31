package com.reactive.demo.Controller;


import com.reactive.demo.Dto.RiderApp.LocationUpdateDto;
import com.reactive.demo.Service.Impl.TrackingServiceImpl;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/customer/tracking")
public class CustomerTrackingController {

    private final TrackingServiceImpl trackingService;

    public CustomerTrackingController(TrackingServiceImpl trackingService) {
        this.trackingService = trackingService;
    }

    // Notice the produces = MediaType.TEXT_EVENT_STREAM_VALUE!
    @GetMapping(value = "/{orderId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<LocationUpdateDto> streamRiderLocation(@PathVariable String orderId) {
        // This will keep returning data until the customer closes the app!
        return trackingService.subscribeToRiderLocation(orderId);
    }
}
