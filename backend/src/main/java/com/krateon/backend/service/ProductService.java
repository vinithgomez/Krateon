package com.krateon.backend.service;

import com.krateon.backend.dto.CategoryResponse;
import com.krateon.backend.dto.ProductRequest;
import com.krateon.backend.dto.ProductResponse;
import com.krateon.backend.dto.ProductVariantResponse;
import com.krateon.backend.entity.Category;
import com.krateon.backend.entity.Product;
import com.krateon.backend.exception.ResourceNotFoundException;
import com.krateon.backend.repository.CategoryRepository;
import com.krateon.backend.repository.ProductRepository;
import com.krateon.backend.repository.ProductSpecifications;
import com.krateon.backend.repository.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ProductVariantRepository productVariantRepository;
    private final ReviewService reviewService;

    // No eviction needed here: a newly created product has no pre-existing cache entry
    // under its id, so there's nothing stale to invalidate.
    public ProductResponse create(ProductRequest request) {
        Category category = findCategoryOrThrow(request.getCategoryId());

        Product product = Product.builder()
                .name(request.getName())
                .description(request.getDescription())
                .price(request.getPrice())
                .imageUrl(request.getImageUrl())
                .category(category)
                .build();

        return toResponse(productRepository.save(product));
    }

    @CacheEvict(value = "products", key = "#id")
    public ProductResponse update(Long id, ProductRequest request) {
        Product product = findProductOrThrow(id);
        Category category = findCategoryOrThrow(request.getCategoryId());

        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setPrice(request.getPrice());
        product.setImageUrl(request.getImageUrl());
        product.setCategory(category);

        return toResponse(productRepository.save(product));
    }

    @CacheEvict(value = "products", key = "#id")
    public void delete(Long id) {
        Product product = findProductOrThrow(id);
        productRepository.delete(product);
    }

    @Cacheable(value = "products", key = "#id")
    public ProductResponse getById(Long id) {
        log.info("CACHE MISS - loading product {} from the database", id);
        ProductResponse response = toResponse(findProductOrThrow(id));

        List<ProductVariantResponse> variants = productVariantRepository.findByProductId(id).stream()
                .map(variant -> ProductVariantResponse.builder()
                        .id(variant.getId())
                        .size(variant.getSize())
                        .build())
                .toList();
        response.setVariants(variants);

        return response;
    }

    public Page<ProductResponse> search(Long categoryId, BigDecimal minPrice, BigDecimal maxPrice,
                                         String keyword, Pageable pageable) {
        Specification<Product> spec = Specification
                .where(ProductSpecifications.hasCategoryId(categoryId))
                .and(ProductSpecifications.hasMinPrice(minPrice))
                .and(ProductSpecifications.hasMaxPrice(maxPrice))
                .and(ProductSpecifications.hasKeyword(keyword));

        return productRepository.findAll(spec, pageable).map(this::toResponse);
    }

    private Product findProductOrThrow(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));
    }

    private Category findCategoryOrThrow(Long categoryId) {
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + categoryId));
    }

    private ProductResponse toResponse(Product product) {
        CategoryResponse categoryResponse = CategoryResponse.builder()
                .id(product.getCategory().getId())
                .name(product.getCategory().getName())
                .description(product.getCategory().getDescription())
                .build();

        ReviewService.ReviewStats reviewStats = reviewService.getAverageRating(product.getId());

        return ProductResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .description(product.getDescription())
                .price(product.getPrice())
                .imageUrl(product.getImageUrl())
                .category(categoryResponse)
                .variants(List.of())
                .averageRating(reviewStats.averageRating())
                .reviewCount(reviewStats.reviewCount())
                .build();
    }

}
