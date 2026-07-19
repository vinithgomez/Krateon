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

    private ProductVariantResponse toResponse(ProductVariant variant) {
        return ProductVariantResponse.builder()
                .id(variant.getId())
                .size(variant.getSize())
                .build();
    }

}
