package com.reactive.demo.Config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.EnableReactiveMongoAuditing;

@Configuration
@EnableReactiveMongoAuditing
public class MongoConfig {
    // This empty class simply turns on MongoDB Auditing for the whole app!
    // Now @CreatedDate and @LastModifiedDate will work automatically.
}
