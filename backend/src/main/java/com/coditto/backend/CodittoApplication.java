package com.coditto.backend;

import com.coditto.backend.judge.RunnerProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(RunnerProperties.class)
public class CodittoApplication {

    public static void main(String[] args) {
        SpringApplication.run(CodittoApplication.class, args);
    }
}
