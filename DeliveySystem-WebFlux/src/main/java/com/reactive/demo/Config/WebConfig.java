package com.reactive.demo.Config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.config.ResourceHandlerRegistry;
import org.springframework.web.reactive.config.WebFluxConfigurer;

@Configuration
public class WebConfig implements WebFluxConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/images/**")
                // This maps the URL /images/... to your Docker container's /app/uploads/ folder
                .addResourceLocations("file:/app/uploads/"); 
    }
    
    
    
    

}
