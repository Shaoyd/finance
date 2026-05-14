package com.know.finance.service;

import com.know.finance.dto.PageResponse;
import com.know.finance.entity.User;
import com.know.finance.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;

    public List<User> getAllUsers() {
        return userMapper.findAll();
    }

    public PageResponse<User> getUsersPage(int pageNum, int pageSize) {
        int offset = (pageNum - 1) * pageSize;
        List<User> list = userMapper.findPage(offset, pageSize);
        long total = userMapper.countAll();
        int pages = (int) Math.ceil((double) total / pageSize);

        return new PageResponse<>(list, total, pageNum, pageSize, pages);
    }

    public User getUserById(Long id) {
        return userMapper.findById(id);
    }

    @Transactional
    public User createUser(User user) {
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setCreateTime(LocalDateTime.now());
        user.setUpdateTime(LocalDateTime.now());
        user.setDeleted(0);
        userMapper.insert(user);
        return user;
    }

    public List<User> getAllCustomerManagers() {
        return userMapper.findAll().stream()
                .filter(user -> "CUSTOMER_MANAGER".equals(user.getUserType()) && user.getStatus() == 1)
                .collect(Collectors.toList());
    }

    @Transactional
    public void updateUser(User user) {
        if (StringUtils.hasText(user.getPassword())) {
            user.setPassword(passwordEncoder.encode(user.getPassword()));
        } else {
            user.setPassword(null);
        }
        userMapper.update(user);
    }

    @Transactional
    public void deleteUser(Long id) {
        userMapper.deleteById(id);
    }

    @Transactional
    public void assignRoles(Long userId, List<Long> roleIds) {
        userMapper.deleteUserRoles(userId);
        if (roleIds != null && !roleIds.isEmpty()) {
            for (Long roleId : roleIds) {
                userMapper.assignUserRole(userId, roleId);
            }
        }
    }

    public List<Long> getUserRoleIds(Long userId) {
        return userMapper.findRoleIdsByUserId(userId);
    }
}
