package com.reactive.demo.Repository;


import com.reactive.demo.Model.DeliveryConfig;
import org.springframework.data.mongodb.repository.ReactiveMongoRepository;

public interface DeliveryConfigRepository extends ReactiveMongoRepository<DeliveryConfig, String> {
}
