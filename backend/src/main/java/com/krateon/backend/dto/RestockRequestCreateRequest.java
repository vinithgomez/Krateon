package com.krateon.backend.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RestockRequestCreateRequest {

    @NotNull(message = "Supplier id is required")
    private Long supplierId;

    @NotNull(message = "Product variant id is required")
    private Long productVariantId;

    @NotNull(message = "Warehouse id is required")
    private Long warehouseId;

    @NotNull(message = "Quantity is required")
    @Positive(message = "Quantity must be greater than zero")
    private Integer quantity;

}
