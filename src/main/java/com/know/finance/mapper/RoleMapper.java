package com.know.finance.mapper;

import com.know.finance.entity.Role;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface RoleMapper {
    Role findById(@Param("id") Long id);

    Role findByRoleCode(@Param("roleCode") String roleCode);

    List<Role> findAll();

    List<Role> findPage(@Param("offset") int offset, @Param("limit") int limit);

    long countAll();

    List<Role> findByUserId(@Param("userId") Long userId);

    int insert(Role role);

    int update(Role role);

    int deleteById(@Param("id") Long id);

    List<Long> findPermissionIdsByRoleId(@Param("roleId") Long roleId);

    int deleteRolePermissions(@Param("roleId") Long roleId);

    int assignRolePermission(@Param("roleId") Long roleId, @Param("permissionId") Long permissionId);
}
