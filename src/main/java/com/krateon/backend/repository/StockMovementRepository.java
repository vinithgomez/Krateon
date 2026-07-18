package com.krateon.backend.repository;

import com.krateon.backend.entity.StockMovement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {

    Page<StockMovement> findByInventoryIdOrderByCreatedAtAsc(Long inventoryId, Pageable pageable);

}
