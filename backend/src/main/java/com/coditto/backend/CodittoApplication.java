package com.coditto.backend;

import com.coditto.backend.judge.RunnerProperties;
import com.coditto.backend.interview.OpenAiProperties;
import com.coditto.backend.problem.ProblemProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties({RunnerProperties.class, ProblemProperties.class, OpenAiProperties.class})
public class CodittoApplication {

    public static void main(String[] args) {
        SpringApplication.run(CodittoApplication.class, args);
    }
}
