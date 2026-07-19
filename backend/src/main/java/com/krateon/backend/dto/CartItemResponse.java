package com.krateon.backend.dto;

import com.krateon.backend.entity.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CartItemResponse {

    private Long id;

    private Long productVariantId;

    private Size size;

    private ProductSummaryResponse product;

    private Integer quantity;

    private BigDecimal subtotal;

}
