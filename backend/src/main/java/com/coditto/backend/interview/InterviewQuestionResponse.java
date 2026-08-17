package com.coditto.backend.interview;

import java.util.List;

public record InterviewQuestionResponse(String status, List<InterviewQuestion> questions) {
    public static InterviewQuestionResponse generated(List<InterviewQuestion> questions) {
        return new InterviewQuestionResponse("GENERATED", List.copyOf(questions));
    }

    public static InterviewQuestionResponse unavailable() {
        return new InterviewQuestionResponse("UNAVAILABLE", List.of());
    }
}
