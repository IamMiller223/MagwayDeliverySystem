package com.reactive.demo.Utils;



//import com.reactive.demo.Model.Restaurant;
//import com.reactive.demo.Repository.RestaurantRepository;
//import org.springframework.boot.CommandLineRunner;
//import org.springframework.stereotype.Component;
//
//import java.util.Arrays;
//import java.util.List;

//@Component
//public class DataSeeder implements CommandLineRunner {
//
//    private final RestaurantRepository restaurantRepository;
//
//    public DataSeeder(RestaurantRepository restaurantRepository) {
//        this.restaurantRepository = restaurantRepository;
//    }
//
//    @Override
//    public void run(String... args) {
//        System.out.println("🌱 Starting Database Seeder...");
//
//        Restaurant r1 = new Restaurant();
//        r1.setName("Khaing Khaing Kyaw (Magway)");
//        r1.setAddress("Pyi Taw Thar Street, Magway");
//        r1.setImage("http://localhost:8080/images/kky_mock.jpg");
//        Restaurant.GeoJsonPoint loc1 = new Restaurant.GeoJsonPoint();
//        loc1.setCoordinates(new double[]{94.9330, 20.1510}); // [Lng, Lat]
//        r1.setLocation(loc1);
//
//        Restaurant r2 = new Restaurant();
//        r2.setName("Shwe Si Taw Tea House");
//        r2.setAddress("Bogyoke Road, Magway");
//        r2.setImage("http://localhost:8080/images/tea_mock.jpg");
//        Restaurant.GeoJsonPoint loc2 = new Restaurant.GeoJsonPoint();
//        loc2.setCoordinates(new double[]{94.9298, 20.1485}); // [Lng, Lat]
//        r2.setLocation(loc2);
//
//        List<Restaurant> mockData = Arrays.asList(r1, r2);
//
//        // The Bulletproof Reactive Chain:
//        // 1. Delete everything (to prevent duplicates on restart)
//        // 2. Save the fresh mock data
//        // 3. Subscribe to force the execution
//        restaurantRepository.deleteAll()
//                .thenMany(restaurantRepository.saveAll(mockData))
//                .subscribe(
//                        saved -> System.out.println("✅ Inserted: " + saved.getName()), // Prints for EACH saved item
//                        error -> System.err.println("🔴 Error seeding data: " + error.getMessage()), 
//                        () -> System.out.println("🎉 All mock data seeded successfully!") 
//                );
//    }}