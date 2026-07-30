package com.krateon.backend.repository;

import com.krateon.backend.entity.StockMovement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {

    Page<StockMovement> findByInventoryIdOrderByCreatedAtAsc(Long inventoryId, Pageable pageable);

    // Used by force-delete's cascade cleanup - stock_movements has its own FK to inventories,
    // so these must be removed before the Inventory rows they belong to.
    List<StockMovement> findByInventory_ProductVariant_Product_Id(Long productId);

}
