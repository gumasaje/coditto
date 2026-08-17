package com.coditto.backend.interview;

/** Deliberately message-free so provider details are never propagated or logged. */
final class ProviderException extends RuntimeException {
    ProviderException() {
        super(null, null, false, false);
    }
}
