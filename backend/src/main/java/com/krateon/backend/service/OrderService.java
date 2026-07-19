package com.krateon.backend.service;

import com.krateon.backend.dto.BuyNowRequest;
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
import com.krateon.backend.entity.ProductVariant;
import com.krateon.backend.entity.StockMovementType;
import com.krateon.backend.entity.User;
import com.krateon.backend.exception.EmptyCartException;
import com.krateon.backend.exception.InsufficientStockException;
import com.krateon.backend.exception.InvalidOrderStatusTransitionException;
import com.krateon.backend.exception.ResourceNotFoundException;
import com.krateon.backend.repository.CartItemRepository;
import com.krateon.backend.repository.InventoryRepository;
import com.krateon.backend.repository.OrderItemRepository;
import com.krateon.backend.repository.OrderRepository;
import com.krateon.backend.repository.ProductVariantRepository;
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
    private final ProductVariantRepository productVariantRepository;

    private record LineItem(ProductVariant productVariant, Integer quantity, BigDecimal priceAtPurchase) {
    }

    private record RequestedLine(ProductVariant productVariant, Integer quantity) {
    }

    @Transactional
    public CheckoutResponse checkout(Long userId) {
        Cart cart = cartService.getOrCreateCart(userId);
        List<CartItem> cartItems = cartItemRepository.findByCartId(cart.getId());

        if (cartItems.isEmpty()) {
            throw new EmptyCartException("Cannot checkout: cart is empty");
        }

        List<RequestedLine> requestedLines = cartItems.stream()
                .map(item -> new RequestedLine(item.getProductVariant(), item.getQuantity()))
                .toList();

        CheckoutResponse response = placeOrder(cart.getUser(), requestedLines, "Order checkout");
        cartService.clearCart(userId);

        return response;
    }

    @Transactional
    public CheckoutResponse buyNow(User user, BuyNowRequest request) {
        ProductVariant productVariant = productVariantRepository.findById(request.getProductVariantId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Product variant not found with id: " + request.getProductVariantId()));

        List<RequestedLine> requestedLines = List.of(new RequestedLine(productVariant, request.getQuantity()));

        return placeOrder(user, requestedLines, "Buy now checkout");
    }

    // Shared by checkout() and buyNow(): locks inventory, deducts stock, and creates the
    // Order/OrderItem/StockMovement records. Both callers only differ in how they assemble
    // the requested (variant, quantity) lines - checkout() from the cart, buyNow() from a
    // single direct request - and in the StockMovement reason text for audit purposes.
    private CheckoutResponse placeOrder(User user, List<RequestedLine> requestedLines, String stockMovementReason) {
        // Lock inventory rows in a consistent order (by product variant id) across all checkouts
        // so two concurrent multi-item checkouts can never take pessimistic locks in opposite
        // orders and deadlock against each other.
        List<RequestedLine> sortedLines = requestedLines.stream()
                .sorted(Comparator.comparing(line -> line.productVariant().getId()))
                .toList();

        List<LineItem> lineItems = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (RequestedLine requestedLine : sortedLines) {
            ProductVariant productVariant = requestedLine.productVariant();
            Integer quantity = requestedLine.quantity();

            Inventory inventory = inventoryRepository.findByProductVariantId(productVariant.getId()).stream()
                    .filter(inv -> inv.getQuantity() >= quantity)
                    .findFirst()
                    .orElseThrow(() -> new InsufficientStockException(
                            "Insufficient stock for product '" + productVariant.getProduct().getName()
                                    + "' (" + productVariant.getSize() + "): requested " + quantity
                                    + " but no warehouse has enough available stock"));

            inventoryService.adjustStock(StockAdjustmentRequest.builder()
                    .inventoryId(inventory.getId())
                    .changeQty(quantity)
                    .type(StockMovementType.SALE)
                    .reason(stockMovementReason)
                    .build());

            BigDecimal priceAtPurchase = productVariant.getProduct().getPrice();
            lineItems.add(new LineItem(productVariant, quantity, priceAtPurchase));
            totalAmount = totalAmount.add(priceAtPurchase.multiply(BigDecimal.valueOf(quantity)));
        }

        Order savedOrder = orderRepository.save(Order.builder()
                .user(user)
                .status(OrderStatus.PLACED)
                .totalAmount(totalAmount)
                .build());

        List<OrderItem> orderItems = lineItems.stream()
                .map(lineItem -> OrderItem.builder()
                        .order(savedOrder)
                        .productVariant(lineItem.productVariant())
                        .quantity(lineItem.quantity())
                        .priceAtPurchase(lineItem.priceAtPurchase())
                        .build())
                .toList();
        orderItemRepository.saveAll(orderItems);

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
                .map(orderItem -> {
                    ProductVariant variant = orderItem.getProductVariant();
                    return OrderItemResponse.builder()
                            .productId(variant.getProduct().getId())
                            .productVariantId(variant.getId())
                            .size(variant.getSize())
                            .productName(variant.getProduct().getName())
                            .quantity(orderItem.getQuantity())
                            .priceAtPurchase(orderItem.getPriceAtPurchase())
                            .subtotal(orderItem.getPriceAtPurchase().multiply(BigDecimal.valueOf(orderItem.getQuantity())))
                            .build();
                })
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
