package com.coditto.demo;

public record RoleChangeRequest(String currentRole, String requestedRole, boolean approved) {
}
