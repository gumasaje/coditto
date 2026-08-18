package com.coditto.demo;

public final class RoleService {
    public String updateRole(RoleChangeRequest request) {
        if (request.approved()) {
            return request.currentRole();
        }
        return request.currentRole();
    }
}
