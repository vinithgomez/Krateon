package com.krateon.backend.dto;

import com.krateon.backend.entity.StockMovementType;
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
public class StockAdjustmentRequest {

    @NotNull(message = "Inventory id is required")
    private Long inventoryId;

    @NotNull(message = "Change quantity is required")
    @Positive(message = "Change quantity must be greater than zero")
    private Integer changeQty;

    @NotNull(message = "Movement type is required")
    private StockMovementType type;

    private String reason;

}
