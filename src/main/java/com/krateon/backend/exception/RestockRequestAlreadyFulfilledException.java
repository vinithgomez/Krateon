package com.krateon.backend.exception;

public class RestockRequestAlreadyFulfilledException extends RuntimeException {

    public RestockRequestAlreadyFulfilledException(String message) {
        super(message);
    }

}
