package com.reactive.demo.Service.Impl;


import com.reactive.demo.Dto.AdminApp.RiderListResponseDto;
import com.reactive.demo.Dto.AdminApp.UpdateRiderRequestDto;
import com.reactive.demo.Dto.AdminApp.UpdateRiderResponseDto;
import com.reactive.demo.Dto.AdminApp.UpdateVehicleRequestDto;
import com.reactive.demo.Dto.AdminApp.VehicleResponseDto;
import com.reactive.demo.Dto.Exception.ResourceNotFoundException;
import com.reactive.demo.Dto.RiderApp.FullRiderProfileDto;
import com.reactive.demo.Model.User;
import com.reactive.demo.Model.Vehicle;
import com.reactive.demo.Repository.UserRepository;
import com.reactive.demo.Repository.VehicleRepository;
import com.reactive.demo.Service.AuthService;
import com.reactive.demo.Service.RiderService;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class RiderServiceImpl implements RiderService {

    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;
    private final AuthService authService; 

    public RiderServiceImpl(UserRepository userRepository, VehicleRepository vehicleRepository, AuthService authService) {
        this.userRepository = userRepository;
        this.vehicleRepository = vehicleRepository;
        this.authService = authService;
    }

    @Override
    public Flux<RiderListResponseDto> getAllRiders() {
        // --- FIX: Use the new DB-sorted repository method! ---
        return userRepository.findByRoleOrderByCreatedAtDesc("RIDER")
                .map(user -> RiderListResponseDto.builder()
                        .riderId(user.getId())
                        .name(user.getName())
                        .phone(user.getPhone())
                        .status(user.getStatus() != null ? user.getStatus() : "AVAILABLE") 
                        .build()
                );
    }

    // --- ADDED: GET RIDER BY ID (With Vehicle Data) ---
 // Make sure you have VehicleRepository injected at the top of your service!
    // private final VehicleRepository vehicleRepository;

    @Override
    public Mono<FullRiderProfileDto> getFullRiderProfile(String riderId) {
        
        // 1. Fetch User Data
        Mono<User> userMono = userRepository.findById(riderId)
                .switchIfEmpty(Mono.error(new ResourceNotFoundException("Rider profile not found in database")));

        // 2. Fetch Vehicle Data (using defaultIfEmpty in case a rider hasn't registered a vehicle yet)
        Mono<Vehicle> vehicleMono = vehicleRepository.findByRiderId(riderId)
                .defaultIfEmpty(new Vehicle()); 

        // 3. Execute concurrently and merge the results
        return Mono.zip(userMono, vehicleMono)
                .map(tuple -> {
                    User user = tuple.getT1();
                    Vehicle vehicle = tuple.getT2();

                    VehicleResponseDto vehicleDto = null;
                    
                    // Only map the vehicle if one actually exists in the database
                    if (vehicle.getId() != null) {
                        vehicleDto = VehicleResponseDto.builder()
                                .id(vehicle.getId())
                                .riderId(vehicle.getRiderId())
                                .type(vehicle.getType())
                                .licenceNumber(vehicle.getLicenceNumber())
                                .createdAt(vehicle.getCreatedAt())
                                .build();
                    }

                    return FullRiderProfileDto.builder()
                            .userId(user.getId())
                            .name(user.getName())
                            .email(user.getEmail())
                            .phone(user.getPhone())
                            .image(user.getImage())
                            .role(user.getRole())
                            .status(user.getStatus())
                            .nrcNumber(user.getNrcNumber())
                            .vehicle(vehicleDto)
                            .build();
                });
    }

    @Override
    public Mono<UpdateRiderResponseDto> updateRiderProfile(String riderId, UpdateRiderRequestDto request) {
        return userRepository.findById(riderId)
                .switchIfEmpty(Mono.error(new ResourceNotFoundException("Rider not found in database.")))
                .flatMap(existingRider -> {
                    if (request.getName() != null) existingRider.setName(request.getName());
                    if (request.getImage() != null) existingRider.setImage(request.getImage());
                    if (request.getPhone() != null) existingRider.setPhone(request.getPhone());
                    if (request.getNrcNumber() != null) existingRider.setNrcNumber(request.getNrcNumber());
                    
                    return userRepository.save(existingRider);
                })
                .map(savedRider -> UpdateRiderResponseDto.builder()
                        .riderId(savedRider.getId())
                        .image(savedRider.getImage())
                        .name(savedRider.getName())
                        .phone(savedRider.getPhone()) // <-- map it to the response!
                        .email(savedRider.getEmail())
                        .nrcNumber(savedRider.getNrcNumber()) 
                        .build());
    }
    
    @Override
    public Mono<VehicleResponseDto> updateRiderVehicle(String riderId, UpdateVehicleRequestDto request) {
        return vehicleRepository.findByRiderId(riderId)
                .switchIfEmpty(Mono.error(new ResourceNotFoundException("No vehicle found for this rider.")))
                .flatMap(existingVehicle -> {
                    existingVehicle.setType(request.getType());
                    existingVehicle.setLicenceNumber(request.getLicenceNumber());
                    return vehicleRepository.save(existingVehicle);
                })
                .map(savedVehicle -> VehicleResponseDto.builder()
                        .id(savedVehicle.getId())
                        .riderId(savedVehicle.getRiderId())
                        .type(savedVehicle.getType())
                        .licenceNumber(savedVehicle.getLicenceNumber())
                        .createdAt(savedVehicle.getCreatedAt())
                        .build());
    }

    @Override
    public Mono<Boolean> deleteRider(String riderId) {
        return userRepository.findById(riderId)
                .switchIfEmpty(Mono.error(new ResourceNotFoundException("Rider not found in database.")))
                .flatMap(user -> {
                    Mono<Void> deleteUser = userRepository.delete(user);
                    Mono<Void> deleteVehicle = vehicleRepository.deleteByRiderId(riderId);
                    Mono<Void> deleteKeycloak = authService.deleteUserInKeycloak(riderId);

                    return Mono.when(deleteUser, deleteVehicle, deleteKeycloak).thenReturn(true);
                });
    }

 
}
