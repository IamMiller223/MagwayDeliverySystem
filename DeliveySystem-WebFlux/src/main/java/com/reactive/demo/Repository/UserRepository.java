package com.reactive.demo.Repository;


import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import org.springframework.stereotype.Repository;

import com.reactive.demo.Model.User;

import reactor.core.publisher.Flux;


@Repository
public interface UserRepository extends ReactiveMongoRepository<User, String> {
	Flux<User> findByRole(String role);
	Flux<User> findByRoleOrderByCreatedAtDesc(String role);
	
}
