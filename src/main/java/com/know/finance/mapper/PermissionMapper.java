package com.know.finance.mapper;

import com.know.finance.entity.Permission;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface PermissionMapper {
    List<Permission> findByUserId(@Param("userId") Long userId);

    List<Permission> findAll();

    List<Permission> findPage(@Param("offset") int offset, @Param("limit") int limit);

    long countAll();

    Permission findById(@Param("id") Long id);

    int insert(Permission permission);

    int update(Permission permission);

    int deleteById(@Param("id") Long id);
}
