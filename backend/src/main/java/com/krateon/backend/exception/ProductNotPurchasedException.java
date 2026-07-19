package com.krateon.backend.exception;

public class ProductNotPurchasedException extends RuntimeException {

    public ProductNotPurchasedException(String message) {
        super(message);
    }

}
