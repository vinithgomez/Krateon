package com.krateon.backend.service;

import com.krateon.backend.dto.CategoryResponse;
import com.krateon.backend.dto.ProductRequest;
import com.krateon.backend.dto.ProductResponse;
import com.krateon.backend.dto.ProductVariantResponse;
import com.krateon.backend.entity.Category;
import com.krateon.backend.entity.Inventory;
import com.krateon.backend.entity.OrderStatus;
import com.krateon.backend.entity.Product;
import com.krateon.backend.entity.ProductVariant;
import com.krateon.backend.entity.RestockRequest;
import com.krateon.backend.entity.Review;
import com.krateon.backend.entity.StockMovement;
import com.krateon.backend.exception.ProductHasRealActivityException;
import com.krateon.backend.exception.ResourceNotFoundException;
import com.krateon.backend.repository.BestSellerProjection;
import com.krateon.backend.repository.CartItemRepository;
import com.krateon.backend.repository.CategoryRepository;
import com.krateon.backend.repository.InventoryRepository;
import com.krateon.backend.repository.OrderItemRepository;
import com.krateon.backend.repository.ProductRepository;
import com.krateon.backend.repository.ProductSpecifications;
import com.krateon.backend.repository.ProductVariantRepository;
import com.krateon.backend.repository.RestockRequestRepository;
import com.krateon.backend.repository.ReviewRepository;
import com.krateon.backend.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductService {

    private static final int MAX_BEST_SELLERS_LIMIT = 20;

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ProductVariantRepository productVariantRepository;
    private final ReviewService reviewService;
    private final OrderItemRepository orderItemRepository;
    private final CartItemRepository cartItemRepository;
    private final InventoryRepository inventoryRepository;
    private final StockMovementRepository stockMovementRepository;
    private final RestockRequestRepository restockRequestRepository;
    private final ReviewRepository reviewRepository;

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

    // Cascade-deletes a product that the normal delete() rejected (FK-protected by variants,
    // inventory, or restock requests) - but ONLY when there is no real customer activity to
    // protect. The order/cart activity check is the one thing this method must never bypass:
    // it is checked first, unconditionally, before anything else is touched.
    @CacheEvict(value = "products", key = "#id")
    @Transactional
    public void forceDelete(Long id) {
        Product product = findProductOrThrow(id);

        if (orderItemRepository.existsByProductVariant_Product_Id(id)
                || cartItemRepository.existsByProductVariant_Product_Id(id)) {
            throw new ProductHasRealActivityException(
                    "Cannot force-delete \"" + product.getName()
                            + "\" - this product has real order or cart history.");
        }

        List<StockMovement> stockMovements = stockMovementRepository.findByInventory_ProductVariant_Product_Id(id);
        stockMovementRepository.deleteAll(stockMovements);

        List<Inventory> inventoryRows = inventoryRepository.findByProductVariant_Product_Id(id);
        inventoryRepository.deleteAll(inventoryRows);

        List<RestockRequest> restockRequests = restockRequestRepository.findByProductVariant_Product_Id(id);
        restockRequestRepository.deleteAll(restockRequests);

        List<Review> reviews = reviewRepository.findAllByProductId(id);
        reviewRepository.deleteAll(reviews);

        List<ProductVariant> variants = productVariantRepository.findByProductId(id);
        productVariantRepository.deleteAll(variants);

        productRepository.delete(product);

        log.warn("Force-deleted product {} (\"{}\") - cascaded {} variant(s), {} inventory row(s), "
                        + "{} stock movement(s), {} restock request(s), {} review(s). No order/cart "
                        + "activity was found for this product.",
                id, product.getName(), variants.size(), inventoryRows.size(), stockMovements.size(),
                restockRequests.size(), reviews.size());
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

    public List<ProductResponse> getBestSellers(int limit) {
        int cappedLimit = Math.min(Math.max(limit, 1), MAX_BEST_SELLERS_LIMIT);

        List<BestSellerProjection> bestSellers = orderItemRepository.findBestSellingProducts(
                OrderStatus.CANCELLED, PageRequest.of(0, cappedLimit));

        // No caching here by design: order data changes too often for a naive cache to be
        // worth it at this scale, and this list is short (<=20 products, capped above).
        return bestSellers.stream()
                .map(projection -> toResponse(findProductOrThrow(projection.getProductId())))
                .toList();
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
