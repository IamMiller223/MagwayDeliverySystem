package com.reactive.demo.Config;

import java.util.List;
import java.util.Map;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableReactiveMethodSecurity;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.server.resource.authentication.ReactiveJwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.web.server.authentication.ServerBearerTokenAuthenticationConverter;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.security.web.server.authentication.ServerAuthenticationConverter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsConfigurationSource;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import reactor.core.publisher.Flux;

@Configuration
@EnableWebFluxSecurity
@EnableReactiveMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityWebFilterChain springSecurityFilterChain(ServerHttpSecurity http) {
        return http
                // Tell Spring Security to use the corsConfigurationSource bean below
                .cors(Customizer.withDefaults())
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .authorizeExchange(exchanges -> exchanges

                        // Browser မှလာသော OPTIONS request များကို အမြဲတမ်း ခွင့်ပြုရန်
                        .pathMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // Public Endpoints
                        .pathMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                        .pathMatchers(HttpMethod.POST, "/api/auth/sign-up").permitAll()
                        .pathMatchers(HttpMethod.GET, "/api/restaurants/**").permitAll()
                        .pathMatchers("/images/**").permitAll()

                        // Make the WebSocket Endpoint completely public
                        .pathMatchers("/ws/**").permitAll()

                        // Authenticated Endpoints
                        .pathMatchers(HttpMethod.GET, "/api/auth/user/**").authenticated()
                        .pathMatchers(HttpMethod.PUT, "/api/auth/user/**").authenticated()

                        .anyExchange().authenticated()
                )
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt
                                .jwtAuthenticationConverter(jwtAuthenticationConverter())
                        )
                )
                .build();
    }

    // ─── THE BULLETPROOF CORS CONFIGURATION BEAN ───
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Explicitly allow your frontend URLs
        configuration.setAllowedOrigins(List.of(
                "https://192.168.137.1:4443",
                "https://localhost:4443",
                "https://192.168.137.85:5173",
                "http://192.168.137.85:5173",
                "https://192.168.137.1:5173",
                "https://172.29.64.1:5173",
                "http://localhost:3000",
                "http://localhost:4200",
                "http://192.168.137.1:4200"
        ));

        configuration.setAllowedMethods(List.of(
                "GET",
                "POST",
                "PUT",
                "DELETE",
                "OPTIONS"
        ));

        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        // Apply this configuration to all routes
        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", configuration);

        return source;
    }

    @Bean
    public ReactiveJwtAuthenticationConverter jwtAuthenticationConverter() {
        ReactiveJwtAuthenticationConverter converter =
                new ReactiveJwtAuthenticationConverter();

        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            Map<String, Object> realmAccess =
                    jwt.getClaimAsMap("realm_access");

            if (realmAccess != null && realmAccess.containsKey("roles")) {
                @SuppressWarnings("unchecked")
                List<String> roles = (List<String>) realmAccess.get("roles");

                return Flux.fromIterable(roles)
                        .map(role -> new SimpleGrantedAuthority(
                                "ROLE_" + role.toUpperCase()
                        ));
            }

            return Flux.empty();
        });

        return converter;
    }

    @Bean
    public ServerAuthenticationConverter customTokenExtractor() {
        ServerBearerTokenAuthenticationConverter defaultConverter =
                new ServerBearerTokenAuthenticationConverter();

        defaultConverter.setAllowUriQueryParameter(true);

        return defaultConverter;
    }
}