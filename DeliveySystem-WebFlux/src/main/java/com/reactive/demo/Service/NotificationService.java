package com.reactive.demo.Service;

import com.reactive.demo.Dto.RiderApp.RiderNotificationDto;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

@Service
public class NotificationService {

	// directBestEffort() ensures the sink acts as a permanent broadcaster.
    // It NEVER terminates, even if all riders disconnect their apps!
    private final Sinks.Many<RiderNotificationDto> notificationSink = 
            Sinks.many().multicast().directBestEffort();

    public void sendNotification(RiderNotificationDto notification) {
        notificationSink.tryEmitNext(notification);
    }

    public Flux<RiderNotificationDto> getNotificationsForRider(String riderId) {
        return notificationSink.asFlux()
                .filter(notification -> notification.getRiderId().equals(riderId));
    }
}
