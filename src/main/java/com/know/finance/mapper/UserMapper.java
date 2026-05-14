package com.know.finance.mapper;

import com.know.finance.entity.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface UserMapper {

    void insert(User user);

    User findById(@Param("id") Long id);

    User findByUsername(@Param("username") String username);

    List<User> findAll();

    List<User> findPage(@Param("offset") int offset,
                        @Param("pageSize") int pageSize);

    int countAll();

    void update(User user);

    void deleteById(@Param("id") Long id);

    List<User> findByManagerId(@Param("managerId") Long managerId);

    void deleteUserRoles(@Param("userId") Long userId);

    void assignUserRole(@Param("userId") Long userId, @Param("roleId") Long roleId);

    List<Long> findRoleIdsByUserId(@Param("userId") Long userId);
}
