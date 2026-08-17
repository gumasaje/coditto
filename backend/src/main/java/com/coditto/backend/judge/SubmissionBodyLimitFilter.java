package com.coditto.backend.judge;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.Charset;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class SubmissionBodyLimitFilter extends OncePerRequestFilter {
    private final JudgeResponseFactory responseFactory;
    private final ObjectMapper objectMapper;

    public SubmissionBodyLimitFilter(JudgeResponseFactory responseFactory, ObjectMapper objectMapper) {
        this.responseFactory = responseFactory;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!"POST".equals(request.getMethod())) {
            return true;
        }
        String path = request.getRequestURI();
        return !"/api/submissions".equals(path) && !"/api/interview-questions".equals(path);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        if (request.getContentLengthLong() > SubmissionLimits.MAX_REQUEST_BODY_BYTES) {
            writeRejected(response);
            return;
        }
        try {
            filterChain.doFilter(new LimitedRequest(request), response);
        } catch (RequestBodyTooLargeException exception) {
            if (!response.isCommitted()) {
                writeRejected(response);
                return;
            }
            throw exception;
        }
    }

    private void writeRejected(HttpServletResponse response) throws IOException {
        JudgeResult result = responseFactory.rejectedSubmission();
        response.setStatus(result.httpStatus());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), result.body());
    }

    private static final class LimitedRequest extends HttpServletRequestWrapper {
        private LimitedRequest(HttpServletRequest request) {
            super(request);
        }

        @Override
        public ServletInputStream getInputStream() throws IOException {
            return new LimitedServletInputStream(super.getInputStream(), SubmissionLimits.MAX_REQUEST_BODY_BYTES);
        }

        @Override
        public BufferedReader getReader() throws IOException {
            String encoding = getCharacterEncoding();
            Charset charset = encoding == null ? Charset.defaultCharset() : Charset.forName(encoding);
            return new BufferedReader(new InputStreamReader(getInputStream(), charset));
        }
    }

    private static final class LimitedServletInputStream extends ServletInputStream {
        private final ServletInputStream delegate;
        private final int limit;
        private int bytesRead;

        private LimitedServletInputStream(ServletInputStream delegate, int limit) {
            this.delegate = delegate;
            this.limit = limit;
        }

        @Override
        public int read() throws IOException {
            int value = delegate.read();
            count(value == -1 ? 0 : 1);
            return value;
        }

        @Override
        public int read(byte[] bytes, int offset, int length) throws IOException {
            int read = delegate.read(bytes, offset, length);
            count(Math.max(read, 0));
            return read;
        }

        private void count(int read) throws RequestBodyTooLargeException {
            bytesRead += read;
            if (bytesRead > limit) {
                throw new RequestBodyTooLargeException();
            }
        }

        @Override
        public boolean isFinished() {
            return delegate.isFinished();
        }

        @Override
        public boolean isReady() {
            return delegate.isReady();
        }

        @Override
        public void setReadListener(ReadListener readListener) {
            delegate.setReadListener(readListener);
        }
    }

    private static final class RequestBodyTooLargeException extends IOException {
    }
}
