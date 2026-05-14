package com.know.finance.service;

import com.know.finance.dto.PageResponse;
import com.know.finance.entity.Permission;
import com.know.finance.mapper.PermissionMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PermissionService {

    private final PermissionMapper permissionMapper;

    public List<Permission> getAllPermissions() {
        return permissionMapper.findAll();
    }

    public PageResponse<Permission> getPermissionsPage(int pageNum, int pageSize) {
        int offset = (pageNum - 1) * pageSize;
        List<Permission> list = permissionMapper.findPage(offset, pageSize);
        long total = permissionMapper.countAll();
        int pages = (int) Math.ceil((double) total / pageSize);

        return new PageResponse<>(list, total, pageNum, pageSize, pages);
    }

    public Permission getPermissionById(Long id) {
        return permissionMapper.findById(id);
    }

    @Transactional
    public Permission createPermission(Permission permission) {
        permission.setStatus(1);
        permissionMapper.insert(permission);
        return permission;
    }

    @Transactional
    public void updatePermission(Permission permission) {
        permissionMapper.update(permission);
    }

    @Transactional
    public void deletePermission(Long id) {
        permissionMapper.deleteById(id);
    }
}
