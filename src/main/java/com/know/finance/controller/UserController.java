package com.know.finance.controller;

import com.know.finance.annotation.RequirePermission;
import com.know.finance.dto.ApiResponse;
import com.know.finance.dto.PageResponse;
import com.know.finance.entity.User;
import com.know.finance.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    @RequirePermission("system:user:view")
    public ApiResponse<List<User>> getAllUsers() {
        return ApiResponse.success(userService.getAllUsers());
    }

    @GetMapping("/page")
    @RequirePermission("system:user:view")
    public ApiResponse<PageResponse<User>> getUsersPage(
            @RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "10") int pageSize) {
        return ApiResponse.success(userService.getUsersPage(pageNum, pageSize));
    }

    @GetMapping("/{id}")
    @RequirePermission("system:user:view")
    public ApiResponse<User> getUserById(@PathVariable Long id) {
        return ApiResponse.success(userService.getUserById(id));
    }

    @PostMapping
    @RequirePermission("system:user:add")
    public ApiResponse<User> createUser(@RequestBody User user) {
        return ApiResponse.success(userService.createUser(user));
    }

    @PutMapping("/{id}")
    @RequirePermission("system:user:edit")
    public ApiResponse<Void> updateUser(@PathVariable Long id, @RequestBody User user) {
        user.setId(id);
        userService.updateUser(user);
        return ApiResponse.success();
    }

    @DeleteMapping("/{id}")
    @RequirePermission("system:user:delete")
    public ApiResponse<Void> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ApiResponse.success();
    }

    @GetMapping("/{id}/roles")
    @RequirePermission("system:user:view")
    public ApiResponse<List<Long>> getUserRoleIds(@PathVariable Long id) {
        return ApiResponse.success(userService.getUserRoleIds(id));
    }

    @PostMapping("/{id}/roles")
    @RequirePermission("system:user:edit")
    public ApiResponse<Void> assignRoles(@PathVariable Long id, @RequestBody Map<String, List<Long>> request) {
        List<Long> roleIds = request.get("roleIds");
        userService.assignRoles(id, roleIds);
        return ApiResponse.success();
    }

    @GetMapping("/managers")
    @RequirePermission("system:user:view")
    public ApiResponse<List<User>> getAllCustomerManagers() {
        return ApiResponse.success(userService.getAllCustomerManagers());
    }
}
