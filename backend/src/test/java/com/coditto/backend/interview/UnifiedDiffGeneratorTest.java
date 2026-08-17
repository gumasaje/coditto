package com.coditto.backend.interview;

import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.Test;

class UnifiedDiffGeneratorTest {
    private final UnifiedDiffGenerator generator = new UnifiedDiffGenerator();

    @Test
    void creates_unified_diff_with_contract_headers_and_three_lines_of_context() {
        String base = "one\ntwo\nthree\nfour\nfive\nsix\nseven\n";
        String source = "one\ntwo\nthree\nFOUR\nfive\nsix\nseven\n";

        String diff = generator.generate("src/Main.java", base, source);

        Assertions.assertThat(diff).startsWith("--- a/src/Main.java\n+++ b/src/Main.java\n@@")
                .contains(" one\n two\n three\n-four\n+FOUR\n five\n six\n seven");
    }

    @Test
    void returns_empty_only_for_identical_content_and_detects_a_final_newline_change() {
        Assertions.assertThat(generator.generate("Candidate.java", "line\n", "line\n")).isEmpty();
        Assertions.assertThat(generator.generate("Candidate.java", "line\n", "line"))
                .startsWith("--- a/Candidate.java\n+++ b/Candidate.java\n@@");
    }

    @Test
    void creates_separate_hunks_for_distant_changes() {
        String base = String.join("\n", java.util.stream.IntStream.rangeClosed(1, 12)
                .mapToObj(number -> "line-" + number).toList()) + "\n";
        String source = base.replace("line-1\n", "changed-1\n").replace("line-12\n", "changed-12\n");

        String diff = generator.generate("Candidate.java", base, source);

        Assertions.assertThat(diff).contains("@@ -1,4 +1,4 @@");
        Assertions.assertThat(diff.lines().filter(line -> line.startsWith("@@")).toList()).hasSize(2);
    }
}
