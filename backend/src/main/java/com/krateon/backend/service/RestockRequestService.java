package com.krateon.backend.service;

import com.krateon.backend.dto.ProductSummaryResponse;
import com.krateon.backend.dto.RestockRequestCreateRequest;
import com.krateon.backend.dto.RestockRequestResponse;
import com.krateon.backend.dto.StockAdjustmentRequest;
import com.krateon.backend.dto.SupplierResponse;
import com.krateon.backend.dto.WarehouseResponse;
import com.krateon.backend.entity.Inventory;
import com.krateon.backend.entity.ProductVariant;
import com.krateon.backend.entity.RestockRequest;
import com.krateon.backend.entity.RestockStatus;
import com.krateon.backend.entity.StockMovementType;
import com.krateon.backend.entity.Supplier;
import com.krateon.backend.entity.Warehouse;
import com.krateon.backend.exception.ResourceNotFoundException;
import com.krateon.backend.exception.RestockRequestAlreadyFulfilledException;
import com.krateon.backend.repository.InventoryRepository;
import com.krateon.backend.repository.ProductVariantRepository;
import com.krateon.backend.repository.RestockRequestRepository;
import com.krateon.backend.repository.SupplierRepository;
import com.krateon.backend.repository.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RestockRequestService {

    private final RestockRequestRepository restockRequestRepository;
    private final SupplierRepository supplierRepository;
    private final ProductVariantRepository productVariantRepository;
    private final WarehouseRepository warehouseRepository;
    private final InventoryRepository inventoryRepository;
    private final InventoryService inventoryService;

    public RestockRequestResponse createRestockRequest(RestockRequestCreateRequest request) {
        Supplier supplier = supplierRepository.findById(request.getSupplierId())
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with id: " + request.getSupplierId()));
        ProductVariant productVariant = productVariantRepository.findById(request.getProductVariantId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Product variant not found with id: " + request.getProductVariantId()));
        Warehouse warehouse = warehouseRepository.findById(request.getWarehouseId())
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found with id: " + request.getWarehouseId()));

        RestockRequest restockRequest = RestockRequest.builder()
                .supplier(supplier)
                .productVariant(productVariant)
                .warehouse(warehouse)
                .quantity(request.getQuantity())
                .status(RestockStatus.PENDING)
                .build();

        return toResponse(restockRequestRepository.save(restockRequest));
    }

    @Transactional
    public RestockRequestResponse fulfillRestockRequest(Long id) {
        RestockRequest restockRequest = findRestockRequestOrThrow(id);

        if (restockRequest.getStatus() != RestockStatus.PENDING) {
            throw new RestockRequestAlreadyFulfilledException(
                    "Restock request #" + id + " has already been fulfilled (status: " + restockRequest.getStatus() + ")");
        }

        Inventory inventory = inventoryRepository.findByProductVariantIdAndWarehouseId(
                        restockRequest.getProductVariant().getId(), restockRequest.getWarehouse().getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No inventory row exists for product variant id " + restockRequest.getProductVariant().getId()
                                + " at warehouse id " + restockRequest.getWarehouse().getId()
                                + ". Initialize inventory via /api/admin/inventory before fulfilling this restock request."));

        StockAdjustmentRequest adjustmentRequest = StockAdjustmentRequest.builder()
                .inventoryId(inventory.getId())
                .changeQty(restockRequest.getQuantity())
                .type(StockMovementType.STOCK_IN)
                .reason("Restock fulfillment for request #" + id)
                .build();
        inventoryService.adjustStock(adjustmentRequest);

        restockRequest.setStatus(RestockStatus.RECEIVED);
        return toResponse(restockRequestRepository.save(restockRequest));
    }

    public RestockRequestResponse getById(Long id) {
        return toResponse(findRestockRequestOrThrow(id));
    }

    public Page<RestockRequestResponse> getAll(Pageable pageable) {
        return restockRequestRepository.findAll(pageable).map(this::toResponse);
    }

    public Page<RestockRequestResponse> getBySupplier(Long supplierId, Pageable pageable) {
        if (!supplierRepository.existsById(supplierId)) {
            throw new ResourceNotFoundException("Supplier not found with id: " + supplierId);
        }

        return restockRequestRepository.findBySupplierId(supplierId, pageable).map(this::toResponse);
    }

    public Page<RestockRequestResponse> getByStatus(RestockStatus status, Pageable pageable) {
        return restockRequestRepository.findByStatus(status, pageable).map(this::toResponse);
    }

    private RestockRequest findRestockRequestOrThrow(Long id) {
        return restockRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Restock request not found with id: " + id));
    }

    private RestockRequestResponse toResponse(RestockRequest restockRequest) {
        ProductVariant variant = restockRequest.getProductVariant();

        SupplierResponse supplierResponse = SupplierResponse.builder()
                .id(restockRequest.getSupplier().getId())
                .name(restockRequest.getSupplier().getName())
                .contactEmail(restockRequest.getSupplier().getContactEmail())
                .contactPhone(restockRequest.getSupplier().getContactPhone())
                .build();

        ProductSummaryResponse productSummary = ProductSummaryResponse.builder()
                .id(variant.getProduct().getId())
                .name(variant.getProduct().getName())
                .price(variant.getProduct().getPrice())
                .build();

        WarehouseResponse warehouseResponse = WarehouseResponse.builder()
                .id(restockRequest.getWarehouse().getId())
                .name(restockRequest.getWarehouse().getName())
                .location(restockRequest.getWarehouse().getLocation())
                .build();

        return RestockRequestResponse.builder()
                .id(restockRequest.getId())
                .supplier(supplierResponse)
                .productVariantId(variant.getId())
                .size(variant.getSize())
                .product(productSummary)
                .warehouse(warehouseResponse)
                .quantity(restockRequest.getQuantity())
                .status(restockRequest.getStatus())
                .createdAt(restockRequest.getCreatedAt())
                .build();
    }

}
