package com.krateon.backend.dto;

import com.krateon.backend.entity.RestockStatus;
import com.krateon.backend.entity.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RestockRequestResponse {

    private Long id;

    private SupplierResponse supplier;

    private Long productVariantId;

    private Size size;

    private ProductSummaryResponse product;

    private WarehouseResponse warehouse;

    private Integer quantity;

    private RestockStatus status;

    private LocalDateTime createdAt;

}
