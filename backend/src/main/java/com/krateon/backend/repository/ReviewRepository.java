package com.krateon.backend.repository;

import com.krateon.backend.entity.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    Page<Review> findByProductId(Long productId, Pageable pageable);

    Optional<Review> findByProductIdAndUserId(Long productId, Long userId);

    // Used by force-delete's cascade cleanup - reviews aren't FK-blocking, but would be
    // orphaned once the product is gone, so they're cleaned up too.
    List<Review> findAllByProductId(Long productId);

    @Query("SELECT AVG(r.rating) AS averageRating, COUNT(r) AS reviewCount FROM Review r WHERE r.product.id = :productId")
    ReviewStatsProjection getStatsForProduct(@Param("productId") Long productId);

}
