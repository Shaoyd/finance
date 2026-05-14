package com.know.finance.controller;

import com.know.finance.annotation.RequirePermission;
import com.know.finance.dto.ApiResponse;
import com.know.finance.dto.PageResponse;
import com.know.finance.entity.Permission;
import com.know.finance.service.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/permissions")
@RequiredArgsConstructor
public class PermissionController {

    private final PermissionService permissionService;

    @GetMapping
    public ApiResponse<List<Permission>> getAllPermissions() {
        return ApiResponse.success(permissionService.getAllPermissions());
    }

    @GetMapping("/page")
    @RequirePermission("system:permission:view")
    public ApiResponse<PageResponse<Permission>> getPermissionsPage(
            @RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "10") int pageSize) {
        return ApiResponse.success(permissionService.getPermissionsPage(pageNum, pageSize));
    }

    @GetMapping("/{id}")
    @RequirePermission("system:permission:view")
    public ApiResponse<Permission> getPermissionById(@PathVariable Long id) {
        return ApiResponse.success(permissionService.getPermissionById(id));
    }

    @PostMapping
    @RequirePermission("system:permission:add")
    public ApiResponse<Permission> createPermission(@RequestBody Permission permission) {
        return ApiResponse.success(permissionService.createPermission(permission));
    }

    @PutMapping("/{id}")
    @RequirePermission("system:permission:edit")
    public ApiResponse<Void> updatePermission(@PathVariable Long id, @RequestBody Permission permission) {
        permission.setId(id);
        permissionService.updatePermission(permission);
        return ApiResponse.success();
    }

    @DeleteMapping("/{id}")
    @RequirePermission("system:permission:delete")
    public ApiResponse<Void> deletePermission(@PathVariable Long id) {
        permissionService.deletePermission(id);
        return ApiResponse.success();
    }
}
