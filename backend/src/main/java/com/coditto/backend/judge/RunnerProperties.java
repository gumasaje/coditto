package com.coditto.backend.judge;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("coditto.runner")
public record RunnerProperties(
        String pythonCommand,
        String scriptPath,
        Duration timeout) {
    public String resolvedPythonCommand() {
        return resolvedPythonCommand(System.getProperty("os.name", ""));
    }

    public String resolvedPythonCommand(String osName) {
        if ("python3".equals(pythonCommand) && osName.startsWith("Windows")) {
            return "python";
        }
        return pythonCommand;
    }
}
