package com.coditto.demo;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class RoleServiceRegressionTest {
    private final RoleService roleService = new RoleService();

    @Test
    void preservesTheCurrentRoleWhenTheChangeIsRejected() {
        assertEquals("MEMBER", roleService.updateRole("MEMBER", "ADMIN", false));
    }
}
