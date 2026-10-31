package com.reactive.demo.Controller;


import com.reactive.demo.Model.DeliveryConfig;
import com.reactive.demo.Repository.DeliveryConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/admin/config")
@RequiredArgsConstructor
public class DeliveryConfigController {

    private final DeliveryConfigRepository configRepository;

    // Hardcoded ID to ensure we only ever have one global config
    private final String CONFIG_ID = "MAIN_PRICING_CONFIG";

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'RIDER', 'CUSTOMER')")
    public Mono<DeliveryConfig> getPricingConfig() {
        return configRepository.findById(CONFIG_ID)
                // If it doesn't exist yet, return your default fallbacks
                .defaultIfEmpty(DeliveryConfig.builder()
                        .id(CONFIG_ID)
                        .baseDeliveryFee(1000.0)
                        .deliveryFeePerKm(200.0)
                        .multiStopFee(500.0)
                        .roundingCeiling(10.0)
                        .build());
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Mono<DeliveryConfig> updatePricingConfig(@RequestBody DeliveryConfig updatedConfig) {
        updatedConfig.setId(CONFIG_ID); // Lock the ID
        return configRepository.save(updatedConfig);
    }
}
