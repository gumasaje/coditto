package com.coditto.backend.interview;

import java.net.URI;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("coditto.interview.openai")
public record OpenAiProperties(String apiKey, URI endpoint, String model) {
    @Override
    public String toString() {
        return "OpenAiProperties[apiKey=<redacted>, endpoint=" + endpoint + ", model=" + model + "]";
    }
}
