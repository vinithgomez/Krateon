package com.krateon.backend.controller;

import com.krateon.backend.dto.CartItemRequest;
import com.krateon.backend.dto.CartResponse;
import com.krateon.backend.security.CurrentUserProvider;
import com.krateon.backend.service.CartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;
    private final CurrentUserProvider currentUserProvider;

    @GetMapping
    public ResponseEntity<CartResponse> getCart() {
        return ResponseEntity.ok(cartService.getCart(currentUserProvider.getCurrentUserId()));
    }

    @PostMapping("/items")
    public ResponseEntity<CartResponse> addItem(@Valid @RequestBody CartItemRequest request) {
        CartResponse response = cartService.addItem(currentUserProvider.getCurrentUserId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/items/{productVariantId}")
    public ResponseEntity<CartResponse> updateItemQuantity(@PathVariable Long productVariantId,
                                                            @Valid @RequestBody CartItemRequest request) {
        CartResponse response = cartService.updateItemQuantity(
                currentUserProvider.getCurrentUserId(), productVariantId, request.getQuantity());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/items/{productVariantId}")
    public ResponseEntity<Void> removeItem(@PathVariable Long productVariantId) {
        cartService.removeItem(currentUserProvider.getCurrentUserId(), productVariantId);
        return ResponseEntity.noContent().build();
    }

}
