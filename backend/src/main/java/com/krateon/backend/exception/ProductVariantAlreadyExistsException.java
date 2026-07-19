package com.krateon.backend.exception;

public class ProductVariantAlreadyExistsException extends RuntimeException {

    public ProductVariantAlreadyExistsException(String message) {
        super(message);
    }

}
