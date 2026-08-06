package com.coditto.backend.judge;

public final class SubmissionLimits {
    // The raw JSON transport limit is larger than the decoded source contract so
    // a 16 KiB source remains valid even when JSON escaping expands its bytes.
    public static final int MAX_REQUEST_BODY_BYTES = 128 * 1024;
    public static final int MAX_SOURCE_BYTES = 16 * 1024;

    private SubmissionLimits() {
    }
}
