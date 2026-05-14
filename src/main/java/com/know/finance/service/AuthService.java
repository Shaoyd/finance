package com.know.finance.service;

import com.know.finance.dto.LoginRequest;
import com.know.finance.dto.LoginResponse;
import com.know.finance.entity.Permission;
import com.know.finance.entity.User;
import com.know.finance.mapper.PermissionMapper;
import com.know.finance.mapper.UserMapper;
import com.know.finance.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserMapper userMapper;
    private final PermissionMapper permissionMapper;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;

    public LoginResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(), request.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);

        User user = userMapper.findByUsername(request.getUsername());

        List<Permission> permissions = permissionMapper.findByUserId(user.getId());
        List<String> permissionCodes = permissions.stream()
                .map(Permission::getPermissionCode)
                .collect(Collectors.toList());

        String token = jwtUtil.generateToken(request.getUsername(), permissionCodes);

        return new LoginResponse(token, user.getUsername(), user.getRealName(), permissionCodes);
    }

    public void register(User user) {
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setStatus(1);
        userMapper.insert(user);
    }
}
