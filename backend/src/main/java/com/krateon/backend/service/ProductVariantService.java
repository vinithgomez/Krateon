package com.krateon.backend.service;

import com.krateon.backend.dto.ProductVariantRequest;
import com.krateon.backend.dto.ProductVariantResponse;
import com.krateon.backend.entity.Product;
import com.krateon.backend.entity.ProductVariant;
import com.krateon.backend.exception.ProductVariantAlreadyExistsException;
import com.krateon.backend.exception.ResourceNotFoundException;
import com.krateon.backend.repository.ProductRepository;
import com.krateon.backend.repository.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductVariantService {

    private final ProductVariantRepository productVariantRepository;
    private final ProductRepository productRepository;

    @Transactional
    public ProductVariantResponse createVariant(Long productId, ProductVariantRequest request) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + productId));

        productVariantRepository.findByProductIdAndSize(productId, request.getSize())
                .ifPresent(existing -> {
                    throw new ProductVariantAlreadyExistsException(
                            "Product " + productId + " already has a " + request.getSize() + " variant (id " + existing.getId() + ")");
                });

        ProductVariant variant = ProductVariant.builder()
                .product(product)
                .size(request.getSize())
                .build();

        return toResponse(productVariantRepository.save(variant));
    }

    public List<ProductVariantResponse> listVariants(Long productId) {
        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Product not found with id: " + productId);
        }

        return productVariantRepository.findByProductId(productId).stream()
                .map(this::toResponse)
                .toList();
    }

    // Relies on the product_id/product_variant_id foreign key constraints on inventory,
    // cart_items, order_items, and restock_requests to reject the delete - GlobalExceptionHandler
    // translates the resulting DataIntegrityViolationException into a 409. Do not add a manual
    // reference check here; it would just duplicate what the database already enforces.
    @Transactional
    public void deleteVariant(Long productId, Long variantId) {
        ProductVariant variant = findVariantOrThrow(productId, variantId);
        productVariantRepository.delete(variant);
    }

    private ProductVariant findVariantOrThrow(Long productId, Long variantId) {
        ProductVariant variant = productVariantRepository.findById(variantId)
                .orElseThrow(() -> new ResourceNotFoundException("Variant not found with id: " + variantId));

        if (!variant.getProduct().getId().equals(productId)) {
            throw new ResourceNotFoundException("Variant not found with id: " + variantId);
        }

        return variant;
    }

    private ProductVariantResponse toResponse(ProductVariant variant) {
        return ProductVariantResponse.builder()
                .id(variant.getId())
                .size(variant.getSize())
                .build();
    }

}
