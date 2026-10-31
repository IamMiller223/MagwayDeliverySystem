package com.reactive.demo.Model;



import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public  class MenuItem {
private String id;
    
    private String name;
    private String description;
    private String image;
    private String category;
    private Double price;
    private Boolean isAvailable;
}
