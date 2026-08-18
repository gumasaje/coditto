package com.likelion.springboot.global.exception;

public class InvalidAssignmentRequestException extends RuntimeException {
    public InvalidAssignmentRequestException(String message) {
        super(message);
    }
}
