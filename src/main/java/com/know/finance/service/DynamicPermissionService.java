package com.know.finance.service;

import com.know.finance.entity.Permission;
import com.know.finance.mapper.PermissionMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Slf4j
@Service
public class DynamicPermissionService {

    private final PermissionMapper permissionMapper;

    private final Map<String, String> urlPermissionMap = new ConcurrentHashMap<>();

    public DynamicPermissionService(PermissionMapper permissionMapper) {
        this.permissionMapper = permissionMapper;
    }

    @PostConstruct
    public void init() {
        try {
            loadPermissions();
            log.info("动态权限配置初始化完成，共加载 {} 条URL权限规则", urlPermissionMap.size());
            log.info("公开访问的URL列表: {}", getPublicUrls());
        } catch (Exception e) {
            log.error("动态权限配置初始化失败，将使用默认配置", e);
            loadDefaultPermissions();
        }
    }

    private void loadDefaultPermissions() {
        log.warn("使用默认权限配置");
        urlPermissionMap.clear();
        urlPermissionMap.put("/login.html", "PUBLIC");
        urlPermissionMap.put("/index.html", "PUBLIC");
        urlPermissionMap.put("/chat.html", "PUBLIC");
        urlPermissionMap.put("/users.html", "PUBLIC");
        urlPermissionMap.put("/roles.html", "PUBLIC");
        urlPermissionMap.put("/permissions.html", "PUBLIC");
        urlPermissionMap.put("/", "PUBLIC");
        urlPermissionMap.put("/css/**", "PUBLIC");
        urlPermissionMap.put("/js/**", "PUBLIC");
        urlPermissionMap.put("/api/auth/**", "PUBLIC");
    }

    public void loadPermissions() {
        List<Permission> permissions = permissionMapper.findAll();

        if (permissions == null || permissions.isEmpty()) {
            log.warn("数据库中未找到权限配置，使用默认配置");
            loadDefaultPermissions();
            return;
        }

        urlPermissionMap.clear();

        for (Permission permission : permissions) {
            if (permission.getStatus() != null && permission.getStatus() == 1
                    && permission.getResourceUrl() != null) {
                urlPermissionMap.put(permission.getResourceUrl(),
                        permission.getAuthType() != null ? permission.getAuthType() : "AUTHENTICATED");
            }
        }

        log.info("重新加载权限配置，当前共有 {} 条URL规则", urlPermissionMap.size());
    }

    public String getAuthType(String url) {
        if (url == null || url.isEmpty()) {
            return "AUTHENTICATED";
        }

        String exactMatch = urlPermissionMap.get(url);
        if (exactMatch != null) {
            return exactMatch;
        }

        for (Map.Entry<String, String> entry : urlPermissionMap.entrySet()) {
            String pattern = entry.getKey();
            if (matchUrlPattern(url, pattern)) {
                return entry.getValue();
            }
        }

        return "AUTHENTICATED";
    }

    public Set<String> getPublicUrls() {
        return urlPermissionMap.entrySet().stream()
                .filter(entry -> "PUBLIC".equals(entry.getValue()))
                .map(Map.Entry::getKey)
                .collect(Collectors.toSet());
    }

    public Set<String> getAllProtectedUrls() {
        return urlPermissionMap.entrySet().stream()
                .filter(entry -> "AUTHENTICATED".equals(entry.getValue()))
                .map(Map.Entry::getKey)
                .collect(Collectors.toSet());
    }

    private boolean matchUrlPattern(String url, String pattern) {
        if (pattern.equals(url)) {
            return true;
        }

        if (pattern.contains("**")) {
            String regex = pattern.replace("**", ".*");
            return url.matches(regex);
        }

        if (pattern.contains("*")) {
            String regex = pattern.replace("*", "[^/]*");
            return url.matches(regex);
        }

        return false;
    }

    public void refreshPermissions() {
        loadPermissions();
    }
}
