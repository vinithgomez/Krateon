package com.krateon.backend.repository;

import com.krateon.backend.entity.ProductVariant;
import com.krateon.backend.entity.Size;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductVariantRepository extends JpaRepository<ProductVariant, Long> {

    List<ProductVariant> findByProductId(Long productId);

    Optional<ProductVariant> findByProductIdAndSize(Long productId, Size size);

}
