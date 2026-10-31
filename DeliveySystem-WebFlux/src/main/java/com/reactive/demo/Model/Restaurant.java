package com.reactive.demo.Model;

import lombok.Builder;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.List;

@Data
@Document(collection = "merchants")
@Builder
public class Restaurant {
    @Id
    private String id;
    private String name;
    private String phone; 
    private String image;
    private String address;
    private GeoLocation location; 
    private List<MenuItem> menuItems;



    
}
