package com.reactive.demo.Utils;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.validation.ObjectError;

import com.reactive.demo.Dto.RestResponse;

import reactor.core.publisher.Mono;

@Component
public class ResponseUtils {
	
	public static <T> Mono<ResponseEntity<RestResponse<T>>> success(HttpStatus status,String message,T data){
		RestResponse<T> restResponse = new RestResponse<T>();
		restResponse.setData(data);
		restResponse.setMessage(message);
		
		return Mono.just(ResponseEntity.status(status).body(restResponse));
		
	}
	
	public static <T> Mono<ResponseEntity<RestResponse<T>>> error(HttpStatus status,String message,Object error){
		
		 RestResponse<T> response = new RestResponse<>();
	        response.setMessage(message);
	        response.setError(error);
	        return Mono.just(ResponseEntity.status(status).body(response));
		
	}
	
	public static Mono<ResponseEntity<RestResponse<Object>>> validationErrorResponse(HttpStatus status,String message,List<ObjectError> errors) {
		
		List<String> errorMessages = errors.stream()
											.map(ObjectError::getDefaultMessage)
											.collect(Collectors.toList());
		RestResponse<Object> response = new RestResponse<>();
	    response.setMessage(message);
	    response.setData(null);
	    response.setError(errorMessages);
	    
	    return Mono.just(ResponseEntity.status(status).body(response));

		
	}

}
