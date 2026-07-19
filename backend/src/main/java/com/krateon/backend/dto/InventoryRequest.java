package com.krateon.backend.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryRequest {

    @NotNull(message = "Product variant id is required")
    private Long productVariantId;

    @NotNull(message = "Warehouse id is required")
    private Long warehouseId;

    @NotNull(message = "Quantity is required")
    @PositiveOrZero(message = "Quantity cannot be negative")
    private Integer quantity;

    @NotNull(message = "Low stock threshold is required")
    @PositiveOrZero(message = "Low stock threshold cannot be negative")
    private Integer lowStockThreshold;

}
