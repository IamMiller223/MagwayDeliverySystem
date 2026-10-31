package com.reactive.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@SpringBootApplication
@EnableMongoAuditing
public class DeliveySystemWebFluxApplication {

	public static void main(String[] args) {
		SpringApplication.run(DeliveySystemWebFluxApplication.class, args);
	}
	
	

}
