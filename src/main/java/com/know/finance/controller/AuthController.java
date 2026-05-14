package com.know.finance.controller;

import com.know.finance.dto.ApiResponse;
import com.know.finance.dto.LoginRequest;
import com.know.finance.dto.LoginResponse;
import com.know.finance.entity.User;
import com.know.finance.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Validated @RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ApiResponse.success(response);
    }

    @PostMapping("/register")
    public ApiResponse<Void> register(@RequestBody User user) {
        authService.register(user);
        return ApiResponse.success();
    }
}
