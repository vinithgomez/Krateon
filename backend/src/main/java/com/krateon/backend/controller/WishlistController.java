package com.krateon.backend.controller;

import com.krateon.backend.dto.WishlistItemRequest;
import com.krateon.backend.dto.WishlistResponse;
import com.krateon.backend.security.CurrentUserProvider;
import com.krateon.backend.service.WishlistService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/wishlist")
@RequiredArgsConstructor
public class WishlistController {

    private final WishlistService wishlistService;
    private final CurrentUserProvider currentUserProvider;

    @GetMapping
    public ResponseEntity<WishlistResponse> getWishlist() {
        return ResponseEntity.ok(wishlistService.getWishlist(currentUserProvider.getCurrentUserId()));
    }

    @PostMapping("/items")
    public ResponseEntity<WishlistResponse> addItem(@Valid @RequestBody WishlistItemRequest request) {
        WishlistResponse response = wishlistService.addItem(currentUserProvider.getCurrentUserId(), request.getProductId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @DeleteMapping("/items/{productId}")
    public ResponseEntity<Void> removeItem(@PathVariable Long productId) {
        wishlistService.removeItem(currentUserProvider.getCurrentUserId(), productId);
        return ResponseEntity.noContent().build();
    }

}
