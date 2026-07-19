package com.krateon.backend.repository;

import com.krateon.backend.entity.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    List<OrderItem> findByOrderId(Long orderId);

    long countByOrderId(Long orderId);

    // Review-gating: a user may only review products they've actually ordered.
    boolean existsByOrder_User_IdAndProductVariant_Product_Id(Long userId, Long productId);

}
