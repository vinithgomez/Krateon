package com.krateon.backend.service;

import com.krateon.backend.dto.CreateReviewRequest;
import com.krateon.backend.dto.ReviewResponse;
import com.krateon.backend.entity.Product;
import com.krateon.backend.entity.Review;
import com.krateon.backend.entity.User;
import com.krateon.backend.exception.ProductNotPurchasedException;
import com.krateon.backend.exception.ResourceNotFoundException;
import com.krateon.backend.repository.OrderItemRepository;
import com.krateon.backend.repository.ProductRepository;
import com.krateon.backend.repository.ReviewRepository;
import com.krateon.backend.repository.ReviewStatsProjection;
import com.krateon.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final OrderItemRepository orderItemRepository;
    private final CacheManager cacheManager;

    public record ReviewStats(double averageRating, long reviewCount) {
    }

    @Transactional
    public ReviewResponse createOrUpdateReview(Long userId, Long productId, CreateReviewRequest request) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + productId));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        if (!orderItemRepository.existsByOrder_User_IdAndProductVariant_Product_Id(userId, productId)) {
            throw new ProductNotPurchasedException(
                    "You can only review products you've purchased. No order for product id " + productId + " was found.");
        }

        Review review = reviewRepository.findByProductIdAndUserId(productId, userId)
                .orElseGet(() -> Review.builder()
                        .product(product)
                        .user(user)
                        .build());

        review.setRating(request.getRating());
        review.setComment(request.getComment());

        ReviewResponse response = toResponse(reviewRepository.save(review));
        evictProductCache(productId);
        return response;
    }

    public Page<ReviewResponse> getReviewsForProduct(Long productId, Pageable pageable) {
        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Product not found with id: " + productId);
        }

        return reviewRepository.findByProductId(productId, pageable).map(this::toResponse);
    }

    public ReviewStats getAverageRating(Long productId) {
        ReviewStatsProjection stats = reviewRepository.getStatsForProduct(productId);
        double average = stats.getAverageRating() != null
                ? Math.round(stats.getAverageRating() * 10.0) / 10.0
                : 0.0;
        long count = stats.getReviewCount() != null ? stats.getReviewCount() : 0L;
        return new ReviewStats(average, count);
    }

    @Transactional
    public void deleteOwnReview(Long userId, Long productId) {
        Review review = reviewRepository.findByProductIdAndUserId(productId, userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No review by the current user exists for product id " + productId));
        reviewRepository.delete(review);
        evictProductCache(productId);
    }

    @Transactional
    public void deleteReviewAsAdmin(Long reviewId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found with id: " + reviewId));
        Long productId = review.getProduct().getId();
        reviewRepository.delete(review);
        evictProductCache(productId);
    }

    // The average rating is embedded in the cached ProductResponse (@Cacheable in
    // ProductService.getById), so any review mutation must evict that entry - otherwise
    // GET /api/products/{id} keeps serving a stale rating until the cache's TTL expires.
    private void evictProductCache(Long productId) {
        Cache productsCache = cacheManager.getCache("products");
        if (productsCache != null) {
            productsCache.evict(productId);
        }
    }

    private ReviewResponse toResponse(Review review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .productId(review.getProduct().getId())
                .userId(review.getUser().getId())
                .userName(review.getUser().getName())
                .rating(review.getRating())
                .comment(review.getComment())
                .createdAt(review.getCreatedAt())
                .build();
    }

}
