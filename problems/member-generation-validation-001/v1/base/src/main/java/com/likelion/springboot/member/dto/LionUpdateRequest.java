package com.likelion.springboot.member.dto;

public class LionUpdateRequest {
    private String major;
    private int generation;
    private String part;
    private String studentId;

    public String getMajor() {
        return major;
    }

    public int getGeneration() {
        return generation;
    }

    public String getPart() {
        return part;
    }

    public String getStudentId() {
        return studentId;
    }
}
