package com.coditto.backend.problem;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("coditto.problems")
public record ProblemProperties(String rootPath) {
}
