package com.krateon.backend.service;

import com.krateon.backend.dto.WarehouseRequest;
import com.krateon.backend.dto.WarehouseResponse;
import com.krateon.backend.entity.Warehouse;
import com.krateon.backend.exception.ResourceNotFoundException;
import com.krateon.backend.repository.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class WarehouseService {

    private final WarehouseRepository warehouseRepository;

    public WarehouseResponse create(WarehouseRequest request) {
        Warehouse warehouse = Warehouse.builder()
                .name(request.getName())
                .location(request.getLocation())
                .build();

        return toResponse(warehouseRepository.save(warehouse));
    }

    public WarehouseResponse update(Long id, WarehouseRequest request) {
        Warehouse warehouse = findWarehouseOrThrow(id);
        warehouse.setName(request.getName());
        warehouse.setLocation(request.getLocation());

        return toResponse(warehouseRepository.save(warehouse));
    }

    public void delete(Long id) {
        Warehouse warehouse = findWarehouseOrThrow(id);
        warehouseRepository.delete(warehouse);
    }

    public WarehouseResponse getById(Long id) {
        return toResponse(findWarehouseOrThrow(id));
    }

    public List<WarehouseResponse> getAll() {
        return warehouseRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    private Warehouse findWarehouseOrThrow(Long id) {
        return warehouseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found with id: " + id));
    }

    private WarehouseResponse toResponse(Warehouse warehouse) {
        return WarehouseResponse.builder()
                .id(warehouse.getId())
                .name(warehouse.getName())
                .location(warehouse.getLocation())
                .build();
    }

}
