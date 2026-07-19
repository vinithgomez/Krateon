package com.krateon.backend.service;

import com.krateon.backend.dto.InventoryRequest;
import com.krateon.backend.dto.InventoryResponse;
import com.krateon.backend.dto.ProductSummaryResponse;
import com.krateon.backend.dto.StockAdjustmentRequest;
import com.krateon.backend.dto.StockMovementResponse;
import com.krateon.backend.dto.WarehouseResponse;
import com.krateon.backend.entity.Inventory;
import com.krateon.backend.entity.ProductVariant;
import com.krateon.backend.entity.StockMovement;
import com.krateon.backend.entity.StockMovementType;
import com.krateon.backend.entity.Warehouse;
import com.krateon.backend.exception.InsufficientStockException;
import com.krateon.backend.exception.InventoryAlreadyExistsException;
import com.krateon.backend.exception.ResourceNotFoundException;
import com.krateon.backend.repository.InventoryRepository;
import com.krateon.backend.repository.ProductRepository;
import com.krateon.backend.repository.ProductVariantRepository;
import com.krateon.backend.repository.StockMovementRepository;
import com.krateon.backend.repository.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class InventoryService {

    private final InventoryRepository inventoryRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final WarehouseRepository warehouseRepository;
    private final StockMovementRepository stockMovementRepository;

    @Transactional
    public InventoryResponse createInventory(InventoryRequest request) {
        ProductVariant productVariant = productVariantRepository.findById(request.getProductVariantId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Product variant not found with id: " + request.getProductVariantId()));
        Warehouse warehouse = warehouseRepository.findById(request.getWarehouseId())
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found with id: " + request.getWarehouseId()));

        inventoryRepository.findByProductVariantIdAndWarehouseId(request.getProductVariantId(), request.getWarehouseId())
                .ifPresent(existing -> {
                    throw new InventoryAlreadyExistsException(
                            "Inventory already exists for product variant id " + request.getProductVariantId()
                                    + " at warehouse id " + request.getWarehouseId()
                                    + ". Use stock adjustment instead of creating a new inventory row.");
                });

        Inventory inventory = Inventory.builder()
                .productVariant(productVariant)
                .warehouse(warehouse)
                .quantity(request.getQuantity())
                .lowStockThreshold(request.getLowStockThreshold())
                .build();

        Inventory savedInventory = inventoryRepository.save(inventory);

        // Initial stock counts as a stock change per CLAUDE.md's audit rule: no quantity
        // change happens without a StockMovement record, even at creation time.
        if (request.getQuantity() > 0) {
            StockMovement movement = StockMovement.builder()
                    .inventory(savedInventory)
                    .changeQty(request.getQuantity())
                    .type(StockMovementType.STOCK_IN)
                    .reason("Initial stock setup")
                    .build();
            stockMovementRepository.save(movement);
        }

        return toResponse(savedInventory);
    }

    @Transactional
    public InventoryResponse adjustStock(StockAdjustmentRequest request) {
        Inventory inventory = inventoryRepository.findByIdForUpdate(request.getInventoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Inventory not found with id: " + request.getInventoryId()));

        // STOCK_OUT and SALE both remove stock from the warehouse; STOCK_IN and RETURN both add it.
        boolean removesStock = request.getType() == StockMovementType.STOCK_OUT
                || request.getType() == StockMovementType.SALE;
        int signedDelta = removesStock ? -request.getChangeQty() : request.getChangeQty();

        int newQuantity = inventory.getQuantity() + signedDelta;

        if (newQuantity < 0) {
            throw new InsufficientStockException(
                    "Insufficient stock: attempted to remove " + request.getChangeQty()
                            + " but only " + inventory.getQuantity() + " available for inventory id " + inventory.getId());
        }

        inventory.setQuantity(newQuantity);
        Inventory savedInventory = inventoryRepository.save(inventory);

        StockMovement movement = StockMovement.builder()
                .inventory(savedInventory)
                .changeQty(signedDelta)
                .type(request.getType())
                .reason(request.getReason())
                .build();
        stockMovementRepository.save(movement);

        return toResponse(savedInventory);
    }

    public List<InventoryResponse> getInventoryByProduct(Long productId) {
        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Product not found with id: " + productId);
        }

        // Returns stock across every size variant of the product, not just one - a product
        // with multiple variants has one Inventory row per (variant, warehouse) pair.
        return inventoryRepository.findByProductVariant_Product_Id(productId).stream()
                .map(this::toResponse)
                .toList();
    }

    public List<InventoryResponse> getLowStockItems() {
        return inventoryRepository.findLowStockItems().stream()
                .map(this::toResponse)
                .toList();
    }

    public Page<StockMovementResponse> getStockMovementHistory(Long inventoryId, Pageable pageable) {
        if (!inventoryRepository.existsById(inventoryId)) {
            throw new ResourceNotFoundException("Inventory not found with id: " + inventoryId);
        }

        return stockMovementRepository.findByInventoryIdOrderByCreatedAtAsc(inventoryId, pageable)
                .map(this::toResponse);
    }

    private InventoryResponse toResponse(Inventory inventory) {
        ProductVariant variant = inventory.getProductVariant();

        ProductSummaryResponse productSummary = ProductSummaryResponse.builder()
                .id(variant.getProduct().getId())
                .name(variant.getProduct().getName())
                .price(variant.getProduct().getPrice())
                .build();

        WarehouseResponse warehouseResponse = WarehouseResponse.builder()
                .id(inventory.getWarehouse().getId())
                .name(inventory.getWarehouse().getName())
                .location(inventory.getWarehouse().getLocation())
                .build();

        return InventoryResponse.builder()
                .id(inventory.getId())
                .productVariantId(variant.getId())
                .size(variant.getSize())
                .product(productSummary)
                .warehouse(warehouseResponse)
                .quantity(inventory.getQuantity())
                .lowStockThreshold(inventory.getLowStockThreshold())
                .lowStock(inventory.getQuantity() <= inventory.getLowStockThreshold())
                .build();
    }

    private StockMovementResponse toResponse(StockMovement movement) {
        return StockMovementResponse.builder()
                .id(movement.getId())
                .inventoryId(movement.getInventory().getId())
                .changeQty(movement.getChangeQty())
                .type(movement.getType())
                .reason(movement.getReason())
                .createdAt(movement.getCreatedAt())
                .build();
    }

}
