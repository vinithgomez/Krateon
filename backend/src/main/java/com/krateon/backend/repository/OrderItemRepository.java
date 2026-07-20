package com.krateon.backend.repository;

import com.krateon.backend.entity.OrderItem;
import com.krateon.backend.entity.OrderStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    List<OrderItem> findByOrderId(Long orderId);

    long countByOrderId(Long orderId);

    // Review-gating: a user may only review products they've actually ordered.
    boolean existsByOrder_User_IdAndProductVariant_Product_Id(Long userId, Long productId);

    @Query("SELECT oi.productVariant.product.id AS productId, SUM(oi.quantity) AS totalQuantity "
            + "FROM OrderItem oi "
            + "WHERE oi.order.status <> :excludedStatus "
            + "GROUP BY oi.productVariant.product.id "
            + "ORDER BY SUM(oi.quantity) DESC")
    List<BestSellerProjection> findBestSellingProducts(@Param("excludedStatus") OrderStatus excludedStatus, Pageable pageable);

}
