package com.coditto.demo;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class RoleServiceTargetTest {
    private final RoleService roleService = new RoleService();

    @Test
    void appliesTheRequestedRoleWhenTheChangeIsApproved() {
        RoleChangeRequest request = new RoleChangeRequest("MEMBER", "ADMIN", true);

        assertEquals("ADMIN", roleService.updateRole(request));
    }
}
