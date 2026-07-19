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
public class OrderItemResponse {

    private Long productId;

    private Long productVariantId;

    private Size size;

    private String productName;

    private Integer quantity;

    private BigDecimal priceAtPurchase;

    private BigDecimal subtotal;

}
