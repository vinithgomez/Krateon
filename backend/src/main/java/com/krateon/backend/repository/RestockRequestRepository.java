package com.krateon.backend.repository;

import com.krateon.backend.entity.RestockRequest;
import com.krateon.backend.entity.RestockStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RestockRequestRepository extends JpaRepository<RestockRequest, Long> {

    Page<RestockRequest> findBySupplierId(Long supplierId, Pageable pageable);

    Page<RestockRequest> findByStatus(RestockStatus status, Pageable pageable);

    // Used by force-delete's cascade cleanup.
    List<RestockRequest> findByProductVariant_Product_Id(Long productId);

}
