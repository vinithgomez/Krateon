package com.krateon.backend.dto;

import com.krateon.backend.entity.StockMovementType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockMovementResponse {

    private Long id;

    private Long inventoryId;

    private Integer changeQty;

    private StockMovementType type;

    private String reason;

    private LocalDateTime createdAt;

}
