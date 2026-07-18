package com.krateon.backend.service;

import com.krateon.backend.dto.CartItemRequest;
import com.krateon.backend.dto.CartItemResponse;
import com.krateon.backend.dto.CartResponse;
import com.krateon.backend.dto.ProductSummaryResponse;
import com.krateon.backend.entity.Cart;
import com.krateon.backend.entity.CartItem;
import com.krateon.backend.entity.Product;
import com.krateon.backend.entity.User;
import com.krateon.backend.exception.ResourceNotFoundException;
import com.krateon.backend.repository.CartItemRepository;
import com.krateon.backend.repository.CartRepository;
import com.krateon.backend.repository.ProductRepository;
import com.krateon.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @Transactional
    public Cart getOrCreateCart(Long userId) {
        return cartRepository.findByUserId(userId)
                .orElseGet(() -> {
                    User user = userRepository.findById(userId)
                            .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
                    return cartRepository.save(Cart.builder().user(user).build());
                });
    }

    @Transactional
    public CartResponse addItem(Long userId, CartItemRequest request) {
        Cart cart = getOrCreateCart(userId);
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + request.getProductId()));

        CartItem item = cartItemRepository.findByCartIdAndProductId(cart.getId(), product.getId())
                .orElseGet(() -> CartItem.builder()
                        .cart(cart)
                        .product(product)
                        .quantity(0)
                        .build());

        item.setQuantity(item.getQuantity() + request.getQuantity());
        cartItemRepository.save(item);

        return toCartResponse(cart);
    }

    @Transactional
    public CartResponse updateItemQuantity(Long userId, Long productId, Integer quantity) {
        Cart cart = getOrCreateCart(userId);
        CartItem item = cartItemRepository.findByCartIdAndProductId(cart.getId(), productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product id " + productId + " is not in the cart"));

        if (quantity == 0) {
            cartItemRepository.delete(item);
        } else {
            item.setQuantity(quantity);
            cartItemRepository.save(item);
        }

        return toCartResponse(cart);
    }

    @Transactional
    public void removeItem(Long userId, Long productId) {
        Cart cart = getOrCreateCart(userId);
        CartItem item = cartItemRepository.findByCartIdAndProductId(cart.getId(), productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product id " + productId + " is not in the cart"));
        cartItemRepository.delete(item);
    }

    @Transactional
    public CartResponse getCart(Long userId) {
        Cart cart = getOrCreateCart(userId);
        return toCartResponse(cart);
    }

    @Transactional
    public void clearCart(Long userId) {
        Cart cart = getOrCreateCart(userId);
        cartItemRepository.deleteAll(cartItemRepository.findByCartId(cart.getId()));
    }

    private CartResponse toCartResponse(Cart cart) {
        List<CartItemResponse> itemResponses = cartItemRepository.findByCartId(cart.getId()).stream()
                .map(this::toCartItemResponse)
                .toList();

        BigDecimal total = itemResponses.stream()
                .map(CartItemResponse::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return CartResponse.builder()
                .id(cart.getId())
                .items(itemResponses)
                .totalAmount(total)
                .build();
    }

    private CartItemResponse toCartItemResponse(CartItem item) {
        BigDecimal subtotal = item.getProduct().getPrice().multiply(BigDecimal.valueOf(item.getQuantity()));

        ProductSummaryResponse productSummary = ProductSummaryResponse.builder()
                .id(item.getProduct().getId())
                .name(item.getProduct().getName())
                .price(item.getProduct().getPrice())
                .build();

        return CartItemResponse.builder()
                .id(item.getId())
                .product(productSummary)
                .quantity(item.getQuantity())
                .subtotal(subtotal)
                .build();
    }

}
