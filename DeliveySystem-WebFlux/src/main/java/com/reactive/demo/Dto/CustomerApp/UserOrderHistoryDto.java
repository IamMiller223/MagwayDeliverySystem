package com.reactive.demo.Dto.CustomerApp;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserOrderHistoryDto {
	
	   private String orderId;
	    private String restaurantName;
	    private Double totalAmount;
	    private String status;
	    private LocalDateTime createdAt;
	

}
