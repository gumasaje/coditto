package com.coditto.demo;

public final class RoleService {
    public String updateRole(String currentRole, String requestedRole, boolean approved) {
        if (approved) {
            return requestedRole;
        }
        return requestedRole;
    }
}
