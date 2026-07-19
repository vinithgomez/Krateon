package com.krateon.backend.repository;

import com.krateon.backend.entity.Inventory;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InventoryRepository extends JpaRepository<Inventory, Long> {

    Optional<Inventory> findByProductVariantIdAndWarehouseId(Long productVariantId, Long warehouseId);

    List<Inventory> findByProductVariantId(Long productVariantId);

    // Used by admin views that show stock across every size variant of a product at a glance.
    List<Inventory> findByProductVariant_Product_Id(Long productId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Inventory i WHERE i.id = :id")
    Optional<Inventory> findByIdForUpdate(@Param("id") Long id);

    @Query("SELECT i FROM Inventory i WHERE i.quantity <= i.lowStockThreshold")
    List<Inventory> findLowStockItems();

}
