package com.krateon.backend.controller;

import com.krateon.backend.dto.ProductVariantRequest;
import com.krateon.backend.dto.ProductVariantResponse;
import com.krateon.backend.service.ProductVariantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/products/{productId}/variants")
@RequiredArgsConstructor
public class ProductVariantController {

    private final ProductVariantService productVariantService;

    @PostMapping
    public ResponseEntity<ProductVariantResponse> create(@PathVariable Long productId,
                                                           @Valid @RequestBody ProductVariantRequest request) {
        ProductVariantResponse response = productVariantService.createVariant(productId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<ProductVariantResponse>> list(@PathVariable Long productId) {
        return ResponseEntity.ok(productVariantService.listVariants(productId));
    }

}
