package com.krateon.backend.service;

import com.krateon.backend.dto.SupplierRequest;
import com.krateon.backend.dto.SupplierResponse;
import com.krateon.backend.entity.Supplier;
import com.krateon.backend.exception.ResourceNotFoundException;
import com.krateon.backend.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SupplierService {

    private final SupplierRepository supplierRepository;

    public SupplierResponse create(SupplierRequest request) {
        Supplier supplier = Supplier.builder()
                .name(request.getName())
                .contactEmail(request.getContactEmail())
                .contactPhone(request.getContactPhone())
                .build();

        return toResponse(supplierRepository.save(supplier));
    }

    public SupplierResponse update(Long id, SupplierRequest request) {
        Supplier supplier = findSupplierOrThrow(id);
        supplier.setName(request.getName());
        supplier.setContactEmail(request.getContactEmail());
        supplier.setContactPhone(request.getContactPhone());

        return toResponse(supplierRepository.save(supplier));
    }

    public void delete(Long id) {
        Supplier supplier = findSupplierOrThrow(id);
        supplierRepository.delete(supplier);
    }

    public SupplierResponse getById(Long id) {
        return toResponse(findSupplierOrThrow(id));
    }

    public List<SupplierResponse> getAll() {
        return supplierRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    private Supplier findSupplierOrThrow(Long id) {
        return supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with id: " + id));
    }

    private SupplierResponse toResponse(Supplier supplier) {
        return SupplierResponse.builder()
                .id(supplier.getId())
                .name(supplier.getName())
                .contactEmail(supplier.getContactEmail())
                .contactPhone(supplier.getContactPhone())
                .build();
    }

}
