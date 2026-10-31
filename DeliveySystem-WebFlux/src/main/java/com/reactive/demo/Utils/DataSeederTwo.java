//package com.reactive.demo.Utils;
//
//import com.reactive.demo.Model.GeoLocation;
//import com.reactive.demo.Model.MenuItem; 
//import com.reactive.demo.Model.Restaurant;
//import com.reactive.demo.Repository.RestaurantRepository;
//import org.springframework.boot.CommandLineRunner;
//import org.springframework.stereotype.Component;
//
//import java.util.ArrayList;
//import java.util.Arrays;
//import java.util.List;
//import java.util.UUID;
//
//@Component
//public class DataSeederTwo implements CommandLineRunner {
//
//    private final RestaurantRepository restaurantRepository;
//
//    public DataSeederTwo(RestaurantRepository restaurantRepository) {
//        this.restaurantRepository = restaurantRepository;
//    }
//
//    @Override
//    public void run(String... args) {
//        System.out.println("🌱 Starting Database Seeder...");
//
//        // --- RESTAURANT 1: KHAING KHAING KYAW ---
//        Restaurant r1 = new Restaurant();
//        r1.setName("Khaing Khaing Kyaw (Magway)");
//        r1.setAddress("Pyi Taw Thar Street, Magway");
//        r1.setImage("http://localhost:8080/images/kky_mock.jpg");
//        
//        // 1. Refined GeoLocation to match the model from the Canvas
//        GeoLocation loc1 = new GeoLocation();
//        loc1.setType("Point"); 
//        loc1.setCoordinates(List.of(94.9330, 20.1510)); // Use List.of() instead of double[]
//        r1.setLocation(loc1);
//
//        // Add Menu Items to Restaurant 1
//        List<MenuItem> kkyMenu = new ArrayList<>();
//        
//        MenuItem mohinga = new MenuItem();
//        mohinga.setItemId(UUID.randomUUID().toString());
//        mohinga.setName("Mohinga Special");
//        mohinga.setDescription("Traditional Burmese noodle soup");
//        mohinga.setPrice(4500.0);
//        mohinga.setAvailable(true);
//        kkyMenu.add(mohinga);
//
//        MenuItem kyayOh = new MenuItem();
//        kyayOh.setItemId(UUID.randomUUID().toString());
//        kyayOh.setName("Kyay Oh");
//        kyayOh.setDescription("Pork marinade noodles");
//        kyayOh.setPrice(4500.0);
//        kyayOh.setAvailable(true);
//        kkyMenu.add(kyayOh);
//        
//        r1.setMenuItems(kkyMenu); 
//
//        // --- RESTAURANT 2: SHWE SI TAW ---
//        Restaurant r2 = new Restaurant();
//        r2.setName("Shwe Si Taw Tea House");
//        r2.setAddress("Bogyoke Road, Magway");
//        r2.setImage("http://localhost:8080/images/tea_mock.jpg");
//        
//        // 2. Updated to use the new GeoLocation model instead of GeoJsonPoint
//        GeoLocation loc2 = new GeoLocation();
//        loc2.setType("Point");
//        loc2.setCoordinates(List.of(94.9298, 20.1485)); // Use List.of() instead of double[]
//        r2.setLocation(loc2);
//
//        // Add Menu Items to Restaurant 2
//        List<MenuItem> teaMenu = new ArrayList<>();
//        
//        MenuItem tea = new MenuItem();
//        tea.setItemId(UUID.randomUUID().toString());
//        tea.setName("Burmese Sweet Tea");
//        tea.setDescription("Classic hot milk tea");
//        tea.setPrice(1500.0);
//        tea.setAvailable(true);
//        teaMenu.add(tea);
//        
//        r2.setMenuItems(teaMenu);
//
//        // --- SAVE TO DATABASE ---
//        List<Restaurant> mockData = Arrays.asList(r1, r2);
//
//        restaurantRepository.deleteAll()
//                .thenMany(restaurantRepository.saveAll(mockData))
//                .subscribe(
//                        saved -> System.out.println("✅ Inserted: " + saved.getName() + " with " + saved.getMenuItems().size() + " menu items."),
//                        error -> System.err.println("🔴 Error seeding data: " + error.getMessage()), 
//                        () -> System.out.println("🎉 All mock data seeded successfully!") 
//                );
//    }
//}