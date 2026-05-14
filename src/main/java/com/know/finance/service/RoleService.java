package com.know.finance.service;

import com.know.finance.dto.PageResponse;
import com.know.finance.entity.Role;
import com.know.finance.mapper.RoleMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoleService {

    private final RoleMapper roleMapper;

    public List<Role> getAllRoles() {
        return roleMapper.findAll();
    }

    public PageResponse<Role> getRolesPage(int pageNum, int pageSize) {
        int offset = (pageNum - 1) * pageSize;
        List<Role> list = roleMapper.findPage(offset, pageSize);
        long total = roleMapper.countAll();
        int pages = (int) Math.ceil((double) total / pageSize);

        return new PageResponse<>(list, total, pageNum, pageSize, pages);
    }

    public Role getRoleById(Long id) {
        return roleMapper.findById(id);
    }

    @Transactional
    public Role createRole(Role role) {
        role.setStatus(1);
        roleMapper.insert(role);
        return role;
    }

    @Transactional
    public void updateRole(Role role) {
        roleMapper.update(role);
    }

    @Transactional
    public void deleteRole(Long id) {
        roleMapper.deleteById(id);
    }

    @Transactional
    public void assignPermissions(Long roleId, List<Long> permissionIds) {
        roleMapper.deleteRolePermissions(roleId);
        if (permissionIds != null && !permissionIds.isEmpty()) {
            for (Long permissionId : permissionIds) {
                roleMapper.assignRolePermission(roleId, permissionId);
            }
        }
    }

    public List<Long> getRolePermissionIds(Long roleId) {
        return roleMapper.findPermissionIdsByRoleId(roleId);
    }
}
