package com.coditto.backend.interview;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Flow;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@SuppressWarnings("unchecked")
@ExtendWith(MockitoExtension.class)
class OpenAiInterviewQuestionProviderTest {
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private HttpClient httpClient;
    @Mock
    private HttpResponse<String> httpResponse;

    @Test
    void does_not_start_an_http_call_without_an_api_key() {
        OpenAiInterviewQuestionProvider provider = provider("");

        Assertions.assertThat(provider.isConfigured()).isFalse();
        Assertions.assertThatThrownBy(() -> provider.generate("prompt").join())
                .hasCauseInstanceOf(ProviderException.class);
        verify(httpClient, never()).sendAsync(any(), any());
    }

    @Test
    void sends_the_strict_chat_completion_schema_with_an_eight_second_timeout() throws Exception {
        when(httpResponse.statusCode()).thenReturn(200);
        when(httpResponse.body()).thenReturn("""
                {"choices":[{"message":{"content":"{\\"questions\\":[]}"}}]}
                """);
        when(httpClient.sendAsync(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(CompletableFuture.completedFuture(httpResponse));
        OpenAiInterviewQuestionProvider provider = provider("test-key-never-log");

        String result = provider.generate("only-this-prompt").join();

        Assertions.assertThat(result).isEqualTo("{\"questions\":[]}");
        ArgumentCaptor<HttpRequest> request = ArgumentCaptor.forClass(HttpRequest.class);
        verify(httpClient).sendAsync(request.capture(), any(HttpResponse.BodyHandler.class));
        Assertions.assertThat(request.getValue().uri())
                .isEqualTo(URI.create("https://example.invalid/v1/chat/completions"));
        Assertions.assertThat(request.getValue().headers().firstValue("Authorization"))
                .contains("Bearer test-key-never-log");
        Assertions.assertThat(request.getValue().timeout()).contains(Duration.ofSeconds(8));

        JsonNode body = objectMapper.readTree(bodyText(request.getValue()));
        Assertions.assertThat(body.path("model").textValue()).isEqualTo("gpt-4o-mini");
        Assertions.assertThat(body.path("messages").get(1).path("content").textValue()).isEqualTo("only-this-prompt");
        JsonNode schema = body.path("response_format").path("json_schema");
        Assertions.assertThat(body.path("response_format").path("type").textValue()).isEqualTo("json_schema");
        Assertions.assertThat(schema.path("strict").booleanValue()).isTrue();
        Assertions.assertThat(schema.path("schema").path("properties").path("questions").path("minItems").intValue())
                .isEqualTo(3);
        Assertions.assertThat(schema.path("schema").path("properties").path("questions").path("maxItems").intValue())
                .isEqualTo(3);
        Assertions.assertThat(schema.path("schema").path("additionalProperties").booleanValue()).isFalse();
    }

    @Test
    void classifies_non_success_and_malformed_provider_envelopes_without_their_body() {
        when(httpResponse.statusCode()).thenReturn(429);
        when(httpResponse.body()).thenReturn("provider secret body");
        when(httpClient.sendAsync(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(CompletableFuture.completedFuture(httpResponse));
        OpenAiInterviewQuestionProvider provider = provider("test-key-never-log");

        Throwable exception = Assertions.catchThrowable(() -> provider.generate("prompt").join());
        Assertions.assertThat(exception).hasCauseInstanceOf(ProviderException.class);
        Assertions.assertThat(String.valueOf(exception.getCause().getMessage()))
                .doesNotContain("provider secret body");

        when(httpResponse.statusCode()).thenReturn(200);
        when(httpResponse.body()).thenReturn("not-json");
        Assertions.assertThatThrownBy(() -> provider.generate("prompt").join())
                .hasCauseInstanceOf(InvalidProviderOutputException.class);
    }

    private OpenAiInterviewQuestionProvider provider(String apiKey) {
        return new OpenAiInterviewQuestionProvider(
                new OpenAiProperties(apiKey, URI.create("https://example.invalid/v1/chat/completions"), "gpt-4o-mini"),
                objectMapper,
                httpClient);
    }

    private String bodyText(HttpRequest request) {
        List<ByteBuffer> chunks = new ArrayList<>();
        request.bodyPublisher().orElseThrow().subscribe(new Flow.Subscriber<>() {
            private Flow.Subscription subscription;

            @Override
            public void onSubscribe(Flow.Subscription subscription) {
                this.subscription = subscription;
                subscription.request(Long.MAX_VALUE);
            }

            @Override
            public void onNext(ByteBuffer item) {
                chunks.add(item.slice());
            }

            @Override
            public void onError(Throwable throwable) {
                throw new AssertionError(throwable);
            }

            @Override
            public void onComplete() {
                subscription.cancel();
            }
        });
        int length = chunks.stream().mapToInt(ByteBuffer::remaining).sum();
        byte[] bytes = new byte[length];
        int index = 0;
        for (ByteBuffer chunk : chunks) {
            int size = chunk.remaining();
            chunk.get(bytes, index, size);
            index += size;
        }
        return new String(bytes, StandardCharsets.UTF_8);
    }
}
