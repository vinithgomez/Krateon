package com.krateon.backend.service;

import com.krateon.backend.dto.CheckoutResponse;
import com.krateon.backend.dto.OrderItemResponse;
import com.krateon.backend.dto.OrderSummaryResponse;
import com.krateon.backend.dto.StockAdjustmentRequest;
import com.krateon.backend.entity.Cart;
import com.krateon.backend.entity.CartItem;
import com.krateon.backend.entity.Inventory;
import com.krateon.backend.entity.Order;
import com.krateon.backend.entity.OrderItem;
import com.krateon.backend.entity.OrderStatus;
import com.krateon.backend.entity.Product;
import com.krateon.backend.entity.StockMovementType;
import com.krateon.backend.exception.EmptyCartException;
import com.krateon.backend.exception.InsufficientStockException;
import com.krateon.backend.exception.InvalidOrderStatusTransitionException;
import com.krateon.backend.exception.ResourceNotFoundException;
import com.krateon.backend.repository.CartItemRepository;
import com.krateon.backend.repository.InventoryRepository;
import com.krateon.backend.repository.OrderItemRepository;
import com.krateon.backend.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class OrderService {

    private static final Set<OrderStatus> TERMINAL_STATUSES = EnumSet.of(OrderStatus.CANCELLED, OrderStatus.DELIVERED);

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final CartItemRepository cartItemRepository;
    private final CartService cartService;
    private final InventoryRepository inventoryRepository;
    private final InventoryService inventoryService;

    private record LineItem(Product product, Integer quantity, BigDecimal priceAtPurchase) {
    }

    @Transactional
    public CheckoutResponse checkout(Long userId) {
        Cart cart = cartService.getOrCreateCart(userId);
        List<CartItem> cartItems = cartItemRepository.findByCartId(cart.getId());

        if (cartItems.isEmpty()) {
            throw new EmptyCartException("Cannot checkout: cart is empty");
        }

        // Lock inventory rows in a consistent order (by product id) across all checkouts so
        // two concurrent multi-item checkouts can never take pessimistic locks in opposite
        // orders and deadlock against each other.
        List<CartItem> sortedItems = cartItems.stream()
                .sorted(Comparator.comparing(item -> item.getProduct().getId()))
                .toList();

        List<LineItem> lineItems = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (CartItem cartItem : sortedItems) {
            Product product = cartItem.getProduct();
            Integer quantity = cartItem.getQuantity();

            Inventory inventory = inventoryRepository.findByProductId(product.getId()).stream()
                    .filter(inv -> inv.getQuantity() >= quantity)
                    .findFirst()
                    .orElseThrow(() -> new InsufficientStockException(
                            "Insufficient stock for product '" + product.getName() + "': requested " + quantity
                                    + " but no warehouse has enough available stock"));

            inventoryService.adjustStock(StockAdjustmentRequest.builder()
                    .inventoryId(inventory.getId())
                    .changeQty(quantity)
                    .type(StockMovementType.SALE)
                    .reason("Order checkout")
                    .build());

            BigDecimal priceAtPurchase = product.getPrice();
            lineItems.add(new LineItem(product, quantity, priceAtPurchase));
            totalAmount = totalAmount.add(priceAtPurchase.multiply(BigDecimal.valueOf(quantity)));
        }

        Order savedOrder = orderRepository.save(Order.builder()
                .user(cart.getUser())
                .status(OrderStatus.PLACED)
                .totalAmount(totalAmount)
                .build());

        List<OrderItem> orderItems = lineItems.stream()
                .map(lineItem -> OrderItem.builder()
                        .order(savedOrder)
                        .product(lineItem.product())
                        .quantity(lineItem.quantity())
                        .priceAtPurchase(lineItem.priceAtPurchase())
                        .build())
                .toList();
        orderItemRepository.saveAll(orderItems);

        cartService.clearCart(userId);

        return toCheckoutResponse(savedOrder, orderItems);
    }

    public Page<OrderSummaryResponse> getOrderHistory(Long userId, Pageable pageable) {
        return orderRepository.findByUserId(userId, pageable).map(this::toSummaryResponse);
    }

    public CheckoutResponse getOrderById(Long userId, Long orderId) {
        Order order = findOrderOrThrow(orderId);

        if (!order.getUser().getId().equals(userId)) {
            // Deliberately the same 404 as "order id doesn't exist" rather than 403, so a
            // caller can't use this endpoint to confirm another user's order id is valid.
            throw new ResourceNotFoundException("Order not found with id: " + orderId);
        }

        return toCheckoutResponse(order, orderItemRepository.findByOrderId(orderId));
    }

    public Page<OrderSummaryResponse> getAllOrders(Pageable pageable, OrderStatus statusFilter) {
        Page<Order> orders = statusFilter != null
                ? orderRepository.findByStatus(statusFilter, pageable)
                : orderRepository.findAll(pageable);

        return orders.map(this::toSummaryResponse);
    }

    @Transactional
    public CheckoutResponse updateOrderStatus(Long orderId, OrderStatus newStatus) {
        Order order = findOrderOrThrow(orderId);

        if (TERMINAL_STATUSES.contains(order.getStatus())) {
            throw new InvalidOrderStatusTransitionException(
                    "Order #" + orderId + " is already " + order.getStatus() + " and cannot transition to " + newStatus);
        }

        order.setStatus(newStatus);
        Order savedOrder = orderRepository.save(order);

        return toCheckoutResponse(savedOrder, orderItemRepository.findByOrderId(orderId));
    }

    private Order findOrderOrThrow(Long orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));
    }

    private CheckoutResponse toCheckoutResponse(Order order, List<OrderItem> orderItems) {
        List<OrderItemResponse> itemResponses = orderItems.stream()
                .map(orderItem -> OrderItemResponse.builder()
                        .productId(orderItem.getProduct().getId())
                        .productName(orderItem.getProduct().getName())
                        .quantity(orderItem.getQuantity())
                        .priceAtPurchase(orderItem.getPriceAtPurchase())
                        .subtotal(orderItem.getPriceAtPurchase().multiply(BigDecimal.valueOf(orderItem.getQuantity())))
                        .build())
                .toList();

        return CheckoutResponse.builder()
                .orderId(order.getId())
                .status(order.getStatus())
                .totalAmount(order.getTotalAmount())
                .items(itemResponses)
                .createdAt(order.getCreatedAt())
                .build();
    }

    private OrderSummaryResponse toSummaryResponse(Order order) {
        long itemCount = orderItemRepository.countByOrderId(order.getId());

        return OrderSummaryResponse.builder()
                .id(order.getId())
                .status(order.getStatus())
                .totalAmount(order.getTotalAmount())
                .createdAt(order.getCreatedAt())
                .itemCount((int) itemCount)
                .build();
    }

}
