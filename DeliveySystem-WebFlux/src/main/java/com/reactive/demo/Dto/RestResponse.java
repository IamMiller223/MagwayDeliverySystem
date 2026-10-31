package com.reactive.demo.Dto;

import org.springframework.stereotype.Component;

import lombok.Data;

@Component
@Data
public class RestResponse <T>{
	 
	private String message;
	private T data;
	private Object error;
	
	

}
