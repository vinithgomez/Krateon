package com.krateon.backend.controller;

import com.krateon.backend.dto.BuyNowRequest;
import com.krateon.backend.dto.CheckoutResponse;
import com.krateon.backend.dto.OrderStatusUpdateRequest;
import com.krateon.backend.dto.OrderSummaryResponse;
import com.krateon.backend.entity.OrderStatus;
import com.krateon.backend.security.CurrentUserProvider;
import com.krateon.backend.service.OrderService;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final CurrentUserProvider currentUserProvider;

    @PostMapping("/api/orders/checkout")
    public ResponseEntity<CheckoutResponse> checkout() {
        CheckoutResponse response = orderService.checkout(currentUserProvider.getCurrentUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/api/orders/buy-now")
    public ResponseEntity<CheckoutResponse> buyNow(@Valid @RequestBody BuyNowRequest request) {
        CheckoutResponse response = orderService.buyNow(currentUserProvider.getCurrentUser(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/api/orders")
    public ResponseEntity<Page<OrderSummaryResponse>> getOrderHistory(@PageableDefault(size = 10) Pageable pageable) {
        Page<OrderSummaryResponse> history = orderService.getOrderHistory(currentUserProvider.getCurrentUserId(), pageable);
        return ResponseEntity.ok(history);
    }

    @GetMapping("/api/orders/{id}")
    public ResponseEntity<CheckoutResponse> getOrderById(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.getOrderById(currentUserProvider.getCurrentUserId(), id));
    }

    @GetMapping("/api/admin/orders")
    public ResponseEntity<Page<OrderSummaryResponse>> getAllOrders(
            @RequestParam(required = false) OrderStatus status,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(orderService.getAllOrders(pageable, status));
    }

    @PutMapping("/api/admin/orders/{id}/status")
    public ResponseEntity<CheckoutResponse> updateOrderStatus(@PathVariable Long id,
                                                               @Valid @RequestBody OrderStatusUpdateRequest request) {
        return ResponseEntity.ok(orderService.updateOrderStatus(id, request.getStatus()));
    }

}
