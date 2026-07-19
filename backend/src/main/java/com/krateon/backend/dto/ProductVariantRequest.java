package com.krateon.backend.dto;

import com.krateon.backend.entity.Size;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductVariantRequest {

    @NotNull(message = "Size is required")
    private Size size;

}
