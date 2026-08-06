package com.coditto.backend.judge;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("coditto.runner")
public record RunnerProperties(
        String pythonCommand,
        String scriptPath,
        Duration timeout) {
}
