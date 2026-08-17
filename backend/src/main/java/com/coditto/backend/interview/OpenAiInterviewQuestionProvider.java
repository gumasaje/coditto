package com.coditto.backend.interview;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class OpenAiInterviewQuestionProvider implements InterviewQuestionProvider {
    static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(8);

    private final OpenAiProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Autowired
    public OpenAiInterviewQuestionProvider(OpenAiProperties properties, ObjectMapper objectMapper) {
        this(properties, objectMapper, HttpClient.newBuilder().connectTimeout(REQUEST_TIMEOUT).build());
    }

    OpenAiInterviewQuestionProvider(
            OpenAiProperties properties,
            ObjectMapper objectMapper,
            HttpClient httpClient) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.httpClient = httpClient;
    }

    @Override
    public boolean isConfigured() {
        return properties.apiKey() != null && !properties.apiKey().isBlank();
    }

    @Override
    public CompletableFuture<String> generate(String prompt) {
        if (!isConfigured()) {
            return CompletableFuture.failedFuture(new ProviderException());
        }
        final String requestBody;
        try {
            requestBody = objectMapper.writeValueAsString(requestBody(prompt));
        } catch (JsonProcessingException exception) {
            return CompletableFuture.failedFuture(new ProviderException());
        }

        HttpRequest request = HttpRequest.newBuilder(properties.endpoint())
                .timeout(REQUEST_TIMEOUT)
                .header("Authorization", "Bearer " + properties.apiKey())
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody, StandardCharsets.UTF_8))
                .build();
        return httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8))
                .thenApply(this::extractContent);
    }

    private JsonNode requestBody(String prompt) {
        var root = objectMapper.createObjectNode();
        root.put("model", properties.model());
        var messages = root.putArray("messages");
        messages.addObject()
                .put("role", "system")
                .put("content", "Generate interview questions only from the provided prompt.");
        messages.addObject().put("role", "user").put("content", prompt);

        var schema = root.putObject("response_format")
                .put("type", "json_schema")
                .putObject("json_schema");
        schema.put("name", "interview_questions");
        schema.put("strict", true);
        var outputSchema = schema.putObject("schema");
        outputSchema.put("type", "object");
        outputSchema.putArray("required").add("questions");
        outputSchema.put("additionalProperties", false);
        var questions = outputSchema.putObject("properties").putObject("questions");
        questions.put("type", "array");
        questions.put("minItems", 3);
        questions.put("maxItems", 3);
        var item = questions.putObject("items");
        item.put("type", "object");
        item.putArray("required").add("question").add("rationale");
        item.put("additionalProperties", false);
        item.putObject("properties").putObject("question").put("type", "string");
        item.withObject("properties").putObject("rationale").put("type", "string");
        return root;
    }

    private String extractContent(HttpResponse<String> response) {
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new ProviderException();
        }
        try {
            JsonNode root = objectMapper.reader()
                    .with(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
                    .readTree(response.body());
            JsonNode choices = root.path("choices");
            if (!choices.isArray() || choices.size() != 1) {
                throw new InvalidProviderOutputException();
            }
            JsonNode content = choices.get(0).path("message").path("content");
            if (!content.isTextual()) {
                throw new InvalidProviderOutputException();
            }
            return content.textValue();
        } catch (JsonProcessingException exception) {
            throw new InvalidProviderOutputException();
        }
    }
}
