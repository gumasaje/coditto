package com.coditto.backend.interview;

/** Deliberately message-free so provider output is never propagated or logged. */
final class InvalidProviderOutputException extends RuntimeException {
    InvalidProviderOutputException() {
        super(null, null, false, false);
    }
}
