package com.likelion.springboot.global.exception;

public class InvalidMemberRequestException extends RuntimeException {
    public InvalidMemberRequestException(String message) {
        super(message);
    }
}
