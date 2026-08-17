package com.coditto.backend.interview;

import org.springframework.stereotype.Component;

@Component
public class InterviewPromptBuilder {
    /** The only dynamic inputs permitted into an interview prompt. */
    public String build(String statement, String unifiedDiff) {
        return """
                Create exactly three concise Korean technical interview questions about the submitted code change.
                Each question must be answerable from the problem statement and unified diff below. Include a brief
                rationale grounded in the diff. Do not claim test results or use information not present below.

                [Problem statement]
                %s

                [Submitted unified diff]
                %s
                """.formatted(statement, unifiedDiff);
    }
}
