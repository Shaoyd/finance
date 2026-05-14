package com.know.finance.controller;

import com.know.finance.dto.ApiResponse;
import com.know.finance.service.DynamicPermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/permissions")
@RequiredArgsConstructor
public class PermissionConfigController {

    private final DynamicPermissionService dynamicPermissionService;

    @PostMapping("/refresh")
    public ApiResponse<Void> refreshPermissions() {
        dynamicPermissionService.refreshPermissions();
        return ApiResponse.success();
    }
}
