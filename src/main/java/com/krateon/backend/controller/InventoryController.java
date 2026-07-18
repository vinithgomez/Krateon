package com.krateon.backend.controller;

import com.krateon.backend.dto.InventoryRequest;
import com.krateon.backend.dto.InventoryResponse;
import com.krateon.backend.dto.StockAdjustmentRequest;
import com.krateon.backend.dto.StockMovementResponse;
import com.krateon.backend.entity.StockMovementType;
import com.krateon.backend.exception.InvalidStockOperationException;
import com.krateon.backend.service.InventoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;

    @PostMapping
    public ResponseEntity<InventoryResponse> createInventory(@Valid @RequestBody InventoryRequest request) {
        InventoryResponse response = inventoryService.createInventory(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/adjust")
    public ResponseEntity<InventoryResponse> adjustStock(@Valid @RequestBody StockAdjustmentRequest request) {
        if (request.getType() == StockMovementType.SALE) {
            throw new InvalidStockOperationException(
                    "SALE movements are reserved for the order checkout flow and cannot be created via manual adjustment");
        }
        return ResponseEntity.ok(inventoryService.adjustStock(request));
    }

    @GetMapping("/product/{productId}")
    public ResponseEntity<List<InventoryResponse>> getInventoryByProduct(@PathVariable Long productId) {
        return ResponseEntity.ok(inventoryService.getInventoryByProduct(productId));
    }

    @GetMapping("/low-stock")
    public ResponseEntity<List<InventoryResponse>> getLowStockItems() {
        return ResponseEntity.ok(inventoryService.getLowStockItems());
    }

    @GetMapping("/{id}/movements")
    public ResponseEntity<Page<StockMovementResponse>> getStockMovementHistory(
            @PathVariable Long id,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(inventoryService.getStockMovementHistory(id, pageable));
    }

}
