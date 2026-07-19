package com.krateon.backend.dto;

import com.krateon.backend.entity.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryResponse {

    private Long id;

    private Long productVariantId;

    private Size size;

    private ProductSummaryResponse product;

    private WarehouseResponse warehouse;

    private Integer quantity;

    private Integer lowStockThreshold;

    private boolean lowStock;

}
