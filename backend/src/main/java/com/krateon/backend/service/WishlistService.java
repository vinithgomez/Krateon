package com.krateon.backend.service;

import com.krateon.backend.dto.ProductSummaryResponse;
import com.krateon.backend.dto.WishlistItemResponse;
import com.krateon.backend.dto.WishlistResponse;
import com.krateon.backend.entity.Product;
import com.krateon.backend.entity.User;
import com.krateon.backend.entity.Wishlist;
import com.krateon.backend.entity.WishlistItem;
import com.krateon.backend.exception.ResourceNotFoundException;
import com.krateon.backend.repository.ProductRepository;
import com.krateon.backend.repository.UserRepository;
import com.krateon.backend.repository.WishlistItemRepository;
import com.krateon.backend.repository.WishlistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class WishlistService {

    private final WishlistRepository wishlistRepository;
    private final WishlistItemRepository wishlistItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @Transactional
    public Wishlist getOrCreateWishlist(Long userId) {
        return wishlistRepository.findByUserId(userId)
                .orElseGet(() -> {
                    User user = userRepository.findById(userId)
                            .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
                    return wishlistRepository.save(Wishlist.builder().user(user).build());
                });
    }

    @Transactional
    public WishlistResponse addItem(Long userId, Long productId) {
        Wishlist wishlist = getOrCreateWishlist(userId);
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + productId));

        // Idempotent: adding a product that's already wishlisted is a no-op, not an error.
        wishlistItemRepository.findByWishlistIdAndProductId(wishlist.getId(), productId)
                .orElseGet(() -> wishlistItemRepository.save(WishlistItem.builder()
                        .wishlist(wishlist)
                        .product(product)
                        .build()));

        return toWishlistResponse(wishlist);
    }

    @Transactional
    public void removeItem(Long userId, Long productId) {
        Wishlist wishlist = getOrCreateWishlist(userId);
        WishlistItem item = wishlistItemRepository.findByWishlistIdAndProductId(wishlist.getId(), productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product id " + productId + " is not in the wishlist"));
        wishlistItemRepository.delete(item);
    }

    @Transactional
    public WishlistResponse getWishlist(Long userId) {
        Wishlist wishlist = getOrCreateWishlist(userId);
        return toWishlistResponse(wishlist);
    }

    private WishlistResponse toWishlistResponse(Wishlist wishlist) {
        List<WishlistItemResponse> itemResponses = wishlistItemRepository.findByWishlistId(wishlist.getId()).stream()
                .map(this::toItemResponse)
                .toList();

        return WishlistResponse.builder()
                .id(wishlist.getId())
                .items(itemResponses)
                .build();
    }

    private WishlistItemResponse toItemResponse(WishlistItem item) {
        ProductSummaryResponse productSummary = ProductSummaryResponse.builder()
                .id(item.getProduct().getId())
                .name(item.getProduct().getName())
                .price(item.getProduct().getPrice())
                .build();

        return WishlistItemResponse.builder()
                .id(item.getId())
                .product(productSummary)
                .build();
    }

}
