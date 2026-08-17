package com.coditto.backend.interview;

import com.github.difflib.DiffUtils;
import com.github.difflib.UnifiedDiffUtils;
import com.github.difflib.patch.Patch;
import java.util.Arrays;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class UnifiedDiffGenerator {
    public String generate(String allowedPath, String baseContent, String source) {
        List<String> original = lines(baseContent);
        List<String> revised = lines(source);
        Patch<String> patch = DiffUtils.diff(original, revised);
        if (patch.getDeltas().isEmpty()) {
            return "";
        }
        return String.join("\n", UnifiedDiffUtils.generateUnifiedDiff(
                "a/" + allowedPath,
                "b/" + allowedPath,
                original,
                patch,
                3));
    }

    private List<String> lines(String content) {
        return Arrays.asList(content.split("\\n", -1));
    }
}
