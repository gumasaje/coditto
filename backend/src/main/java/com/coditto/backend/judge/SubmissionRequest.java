package com.coditto.backend.judge;

/**
 * Phase B accepts exactly one source file for the public role-update-001 v1
 * fixture. The source is never loaded or executed by this API process.
 */
public record SubmissionRequest(String source) {
}
