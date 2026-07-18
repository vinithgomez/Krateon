package com.krateon.backend.controller;

import com.krateon.backend.dto.RestockRequestCreateRequest;
import com.krateon.backend.dto.RestockRequestResponse;
import com.krateon.backend.entity.RestockStatus;
import com.krateon.backend.service.RestockRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/restock-requests")
@RequiredArgsConstructor
public class RestockRequestController {

    private final RestockRequestService restockRequestService;

    @PostMapping
    public ResponseEntity<RestockRequestResponse> create(@Valid @RequestBody RestockRequestCreateRequest request) {
        RestockRequestResponse response = restockRequestService.createRestockRequest(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/{id}/fulfill")
    public ResponseEntity<RestockRequestResponse> fulfill(@PathVariable Long id) {
        return ResponseEntity.ok(restockRequestService.fulfillRestockRequest(id));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RestockRequestResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(restockRequestService.getById(id));
    }

    @GetMapping
    public ResponseEntity<Page<RestockRequestResponse>> list(
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) RestockStatus status,
            @PageableDefault(size = 10) Pageable pageable) {

        Page<RestockRequestResponse> results;
        if (status != null) {
            results = restockRequestService.getByStatus(status, pageable);
        } else if (supplierId != null) {
            results = restockRequestService.getBySupplier(supplierId, pageable);
        } else {
            results = restockRequestService.getAll(pageable);
        }

        return ResponseEntity.ok(results);
    }

}
