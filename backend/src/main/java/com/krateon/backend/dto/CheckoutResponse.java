package com.krateon.backend.dto;

import com.krateon.backend.entity.OrderStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckoutResponse {

    private Long orderId;

    private OrderStatus status;

    private BigDecimal totalAmount;

    private List<OrderItemResponse> items;

    private LocalDateTime createdAt;

}
