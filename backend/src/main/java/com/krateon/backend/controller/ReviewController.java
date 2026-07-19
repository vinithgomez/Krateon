package com.krateon.backend.controller;

import com.krateon.backend.dto.CreateReviewRequest;
import com.krateon.backend.dto.ReviewResponse;
import com.krateon.backend.security.CurrentUserProvider;
import com.krateon.backend.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;
    private final CurrentUserProvider currentUserProvider;

    @PostMapping("/api/products/{productId}/reviews")
    public ResponseEntity<ReviewResponse> createReview(@PathVariable Long productId,
                                                         @Valid @RequestBody CreateReviewRequest request) {
        ReviewResponse response = reviewService.createOrUpdateReview(
                currentUserProvider.getCurrentUserId(), productId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/api/products/{productId}/reviews")
    public ResponseEntity<ReviewResponse> updateReview(@PathVariable Long productId,
                                                         @Valid @RequestBody CreateReviewRequest request) {
        ReviewResponse response = reviewService.createOrUpdateReview(
                currentUserProvider.getCurrentUserId(), productId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/products/{productId}/reviews")
    public ResponseEntity<Page<ReviewResponse>> getReviews(@PathVariable Long productId,
                                                             @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(reviewService.getReviewsForProduct(productId, pageable));
    }

    @DeleteMapping("/api/products/{productId}/reviews")
    public ResponseEntity<Void> deleteOwnReview(@PathVariable Long productId) {
        reviewService.deleteOwnReview(currentUserProvider.getCurrentUserId(), productId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/api/admin/reviews/{id}")
    public ResponseEntity<Void> deleteReviewAsAdmin(@PathVariable Long id) {
        reviewService.deleteReviewAsAdmin(id);
        return ResponseEntity.noContent().build();
    }

}
