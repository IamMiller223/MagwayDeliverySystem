package com.reactive.demo.Dto.Exception;

public class OrderProcessFailException extends RuntimeException{

	/**
	 * 
	 */
	private static final long serialVersionUID = 1L;
	
	public OrderProcessFailException(String message) {
        super(message);
    }

}
