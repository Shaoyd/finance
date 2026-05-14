package com.know.finance.controller;

import com.know.finance.annotation.RequirePermission;
import com.know.finance.dto.ApiResponse;
import com.know.finance.dto.PageResponse;
import com.know.finance.entity.Role;
import com.know.finance.service.RoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleService roleService;

    @GetMapping
    public ApiResponse<List<Role>> getAllRoles() {
        return ApiResponse.success(roleService.getAllRoles());
    }

    @GetMapping("/page")
    @RequirePermission("system:role:view")
    public ApiResponse<PageResponse<Role>> getRolesPage(
            @RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "10") int pageSize) {
        return ApiResponse.success(roleService.getRolesPage(pageNum, pageSize));
    }

    @GetMapping("/{id}")
    @RequirePermission("system:role:view")
    public ApiResponse<Role> getRoleById(@PathVariable Long id) {
        return ApiResponse.success(roleService.getRoleById(id));
    }

    @PostMapping
    @RequirePermission("system:role:add")
    public ApiResponse<Role> createRole(@RequestBody Role role) {
        return ApiResponse.success(roleService.createRole(role));
    }

    @PutMapping("/{id}")
    @RequirePermission("system:role:edit")
    public ApiResponse<Void> updateRole(@PathVariable Long id, @RequestBody Role role) {
        role.setId(id);
        roleService.updateRole(role);
        return ApiResponse.success();
    }

    @DeleteMapping("/{id}")
    @RequirePermission("system:role:delete")
    public ApiResponse<Void> deleteRole(@PathVariable Long id) {
        roleService.deleteRole(id);
        return ApiResponse.success();
    }

    @GetMapping("/{id}/permissions")
    @RequirePermission("system:role:view")
    public ApiResponse<List<Long>> getRolePermissionIds(@PathVariable Long id) {
        return ApiResponse.success(roleService.getRolePermissionIds(id));
    }

    @PostMapping("/{id}/permissions")
    @RequirePermission("system:role:edit")
    public ApiResponse<Void> assignPermissions(@PathVariable Long id, @RequestBody Map<String, List<Long>> request) {
        List<Long> permissionIds = request.get("permissionIds");
        roleService.assignPermissions(id, permissionIds);
        return ApiResponse.success();
    }
}
