package com.know.finance.aspect;

import com.know.finance.annotation.RequirePermission;
import com.know.finance.security.CustomUserDetails;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Aspect
@Component
public class PermissionAspect {

    @Before("@annotation(com.know.finance.annotation.RequirePermission)")
    public void checkPermission(JoinPoint joinPoint) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("未认证用户");
        }

        Object principal = authentication.getPrincipal();
        if (!(principal instanceof CustomUserDetails)) {
            throw new RuntimeException("用户信息不存在");
        }

        CustomUserDetails userDetails = (CustomUserDetails) principal;

        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        RequirePermission requirePermission = method.getAnnotation(RequirePermission.class);

        String requiredPermission = requirePermission.value();

        List<String> userPermissions = userDetails.getPermissions().stream()
                .map(p -> p.getPermissionCode())
                .collect(Collectors.toList());

        log.debug("检查权限: 用户={}, 需要权限={}, 用户拥有权限={}",
                userDetails.getUsername(), requiredPermission, userPermissions);

        if (!userPermissions.contains(requiredPermission)) {
            log.warn("权限不足: 用户={}, 需要权限={}", userDetails.getUsername(), requiredPermission);
            throw new RuntimeException("权限不足，无法执行此操作");
        }
    }
}
