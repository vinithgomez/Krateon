package com.krateon.backend.repository;

import com.krateon.backend.entity.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {

    List<CartItem> findByCartId(Long cartId);

    Optional<CartItem> findByCartIdAndProductVariantId(Long cartId, Long productVariantId);

    // Force-delete safety check: an active cart holding this product counts as real customer
    // activity, so force-delete must refuse to touch it.
    boolean existsByProductVariant_Product_Id(Long productId);

}
