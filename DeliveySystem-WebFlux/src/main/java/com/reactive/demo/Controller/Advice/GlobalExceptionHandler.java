package com.reactive.demo.Controller.Advice;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.support.WebExchangeBindException;

import com.reactive.demo.Dto.RestResponse;
import com.reactive.demo.Dto.Exception.AccountNotVerifiedException;
import com.reactive.demo.Dto.Exception.AuthenticationFailedException;
import com.reactive.demo.Dto.Exception.IdNotFoundException;
import com.reactive.demo.Dto.Exception.InvalidOrderStatusException;
import com.reactive.demo.Dto.Exception.ResourceNotFoundException;
import com.reactive.demo.Utils.ResponseUtils;

import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.Mono;

@Slf4j
@ControllerAdvice
public class GlobalExceptionHandler {
	
	@ExceptionHandler(IdNotFoundException.class)
	public Mono<ResponseEntity<RestResponse<Object>>> handleIdnotFound(IdNotFoundException ex){
		log.info("Handle Not Found Exception Worked");
		return ResponseUtils.error(HttpStatus.NOT_FOUND, ex.getLocalizedMessage(), null);
		
	}
	
	@ExceptionHandler(ResourceNotFoundException.class)
    public Mono<ResponseEntity<RestResponse<Object>>> handleResourceNotFound(ResourceNotFoundException ex) {
        return ResponseUtils.error(
                HttpStatus.NOT_FOUND, 
                "Data not found", 
                ex.getMessage()
        );
    }
	
	@ExceptionHandler(AuthenticationFailedException.class)
    public Mono<ResponseEntity<RestResponse<Object>>> handleAuthException(AuthenticationFailedException ex) {
        return ResponseUtils.error(
                HttpStatus.UNAUTHORIZED, 
                "Authentication Failed", 
                ex.getMessage()
        );
    }
	
	// NEW: Specifically catches the unverified email scenario
    @ExceptionHandler(AccountNotVerifiedException.class)
    public Mono<ResponseEntity<RestResponse<Object>>> handleAccountNotVerified(AccountNotVerifiedException ex) {
        
        return ResponseUtils.error(
                HttpStatus.FORBIDDEN,          // 403 Forbidden is perfect for this
                "Action Required", 
                "EMAIL_NOT_VERIFIED"           // A strict code for the frontend!
        );
    }
    
    
    @ExceptionHandler(InvalidOrderStatusException.class)
    public Mono<ResponseEntity<RestResponse<Object>>> handleInvalidOrderStatus(InvalidOrderStatusException ex) {
        log.warn("Invalid Order Status Action: {}", ex.getMessage());
        return ResponseUtils.error(
                HttpStatus.BAD_REQUEST, 
                "Invalid Order Action", 
                ex.getMessage()
        );
    }
    
    

	
	
    @ExceptionHandler(WebExchangeBindException.class)
    public Mono<ResponseEntity<RestResponse<Object>>> handleValidationExceptions(WebExchangeBindException ex) {
        
        // We pass the exact error list straight into your awesome utility method
        return ResponseUtils.validationErrorResponse(
                HttpStatus.BAD_REQUEST, 
                "Validation Failed", 
                ex.getBindingResult().getAllErrors()
        );
    }
}
