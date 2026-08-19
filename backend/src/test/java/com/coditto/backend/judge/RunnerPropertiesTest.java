package com.coditto.backend.judge;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class RunnerPropertiesTest {
    @Test
    void uses_python_on_windows_when_python3_is_configured() {
        RunnerProperties properties = new RunnerProperties("python3", "run.py", null);
        assertThat(properties.resolvedPythonCommand("Windows 10")).isEqualTo("python");
    }

    @Test
    void keeps_python3_off_windows() {
        RunnerProperties properties = new RunnerProperties("python3", "run.py", null);
        assertThat(properties.resolvedPythonCommand("Linux")).isEqualTo("python3");
    }

    @Test
    void keeps_an_explicit_override() {
        RunnerProperties properties = new RunnerProperties("py", "run.py", null);
        assertThat(properties.resolvedPythonCommand("Windows 10")).isEqualTo("py");
    }
}
