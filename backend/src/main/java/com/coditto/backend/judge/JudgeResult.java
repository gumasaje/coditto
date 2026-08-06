package com.coditto.backend.judge;

import com.fasterxml.jackson.databind.JsonNode;

/** The normalized public result emitted by judge-runner/run.py. */
public record JudgeResult(JsonNode body, int httpStatus) {
}
