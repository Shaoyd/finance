-- ============================================
-- 基于用户数据权限控制的知识问答
-- ============================================

-- 用户表：存储系统用户基本信息
CREATE TABLE IF NOT EXISTS sys_user (
    id BIGSERIAL PRIMARY KEY,                              -- 主键ID，自增
    username VARCHAR(50) NOT NULL UNIQUE,                  -- 用户名，唯一标识，用于登录
    password VARCHAR(255) NOT NULL,                        -- 密码，BCrypt加密存储
    real_name VARCHAR(100),                                -- 真实姓名
    email VARCHAR(100),                                    -- 电子邮箱地址
    phone VARCHAR(20),                                     -- 手机号码
    user_type VARCHAR(20) DEFAULT 'CUSTOMER_MANAGER',      -- 用户类型：CUSTOMER_MANAGER-客户经理，CUSTOMER-客户
    employee_number VARCHAR(50),                           -- 员工编号（仅客户经理需要填写）
    manager_id BIGINT,                                     -- 所属客户经理ID（仅客户需要填写，关联sys_user表）
    status SMALLINT DEFAULT 1,                             -- 状态：0-禁用，1-启用
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,       -- 创建时间
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,       -- 最后更新时间
    deleted SMALLINT DEFAULT 0                             -- 逻辑删除标识：0-未删除，1-已删除
    );

-- 角色表：存储系统角色信息
CREATE TABLE IF NOT EXISTS sys_role (
    id BIGSERIAL PRIMARY KEY,                              -- 主键ID，自增
    role_code VARCHAR(50) NOT NULL UNIQUE,                 -- 角色编码，唯一标识（如：ROLE_ADMIN）
    role_name VARCHAR(100) NOT NULL,                       -- 角色名称（如：超级管理员）
    description VARCHAR(255),                              -- 角色描述信息
    status SMALLINT DEFAULT 1,                             -- 状态：0-禁用，1-启用
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,       -- 创建时间
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,       -- 最后更新时间
    deleted SMALLINT DEFAULT 0                             -- 逻辑删除标识：0-未删除，1-已删除
    );

-- 权限表：存储系统权限/菜单/按钮等资源信息
CREATE TABLE IF NOT EXISTS sys_permission (
    id BIGSERIAL PRIMARY KEY,                              -- 主键ID，自增
    permission_code VARCHAR(50) NOT NULL UNIQUE,           -- 权限编码，唯一标识（如：system:user:view）
    permission_name VARCHAR(100) NOT NULL,                 -- 权限名称（如：查看用户）
    resource_type VARCHAR(20),                             -- 资源类型：menu-菜单，button-按钮，page-页面，api-接口，static-静态资源
    resource_url VARCHAR(255),                             -- 资源URL路径或接口路径
    parent_id BIGINT DEFAULT 0,                            -- 父级权限ID，0表示顶级权限
    sort_order INT DEFAULT 0,                              -- 排序号，数字越小越靠前
    auth_type VARCHAR(20) DEFAULT 'AUTHENTICATED',         -- 认证类型：PUBLIC-公开访问，AUTHENTICATED-需要登录
    status SMALLINT DEFAULT 1,                             -- 状态：0-禁用，1-启用
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,       -- 创建时间
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,       -- 最后更新时间
    deleted SMALLINT DEFAULT 0                             -- 逻辑删除标识：0-未删除，1-已删除
    );

-- 用户角色关联表：实现用户与角色的多对多关系
CREATE TABLE IF NOT EXISTS sys_user_role (
    id BIGSERIAL PRIMARY KEY,                              -- 主键ID，自增
    user_id BIGINT NOT NULL,                               -- 用户ID，关联sys_user表
    role_id BIGINT NOT NULL,                               -- 角色ID，关联sys_role表
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,       -- 关联创建时间
    CONSTRAINT uk_user_role UNIQUE(user_id, role_id)       -- 唯一约束：同一用户不能重复关联同一角色
    );

-- 角色权限关联表：实现角色与权限的多对多关系
CREATE TABLE IF NOT EXISTS sys_role_permission (
    id BIGSERIAL PRIMARY KEY,                              -- 主键ID，自增
    role_id BIGINT NOT NULL,                               -- 角色ID，关联sys_role表
    permission_id BIGINT NOT NULL,                         -- 权限ID，关联sys_permission表
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,       -- 关联创建时间
    CONSTRAINT uk_role_permission UNIQUE(role_id, permission_id)  -- 唯一约束：同一角色不能重复关联同一权限
    );

-- ============================================
-- 初始化数据
-- ============================================

-- 插入默认管理员用户（密码：admin123）
INSERT INTO sys_user (username, password, real_name, email, status) VALUES
    ('admin', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', '管理员', 'admin@example.com', 1);

-- 插入默认角色
INSERT INTO sys_role (role_code, role_name, description) VALUES
    ('ROLE_ADMIN', '超级管理员', '拥有所有权限'),
    ('ROLE_USER', '普通用户', '基本权限');

-- 插入系统权限（菜单、按钮、页面、接口等）
INSERT INTO sys_permission (permission_code, permission_name, resource_type, resource_url, parent_id, sort_order, auth_type) VALUES
    -- 用户管理权限
    ('system:user:view', '查看用户', 'menu', '/api/users', 0, 1, 'AUTHENTICATED'),
    ('system:user:add', '新增用户', 'button', '/api/users', 0, 2, 'AUTHENTICATED'),
    ('system:user:edit', '编辑用户', 'button', '/api/users', 0, 3, 'AUTHENTICATED'),
    ('system:user:delete', '删除用户', 'button', '/api/users', 0, 4, 'AUTHENTICATED'),
    -- 角色管理权限
    ('system:role:view', '查看角色', 'menu', '/api/roles', 0, 5, 'AUTHENTICATED'),
    ('system:role:add', '新增角色', 'button', '/api/roles', 0, 6, 'AUTHENTICATED'),
    ('system:role:edit', '编辑角色', 'button', '/api/roles', 0, 7, 'AUTHENTICATED'),
    ('system:role:delete', '删除角色', 'button', '/api/roles', 0, 8, 'AUTHENTICATED'),
    -- 权限管理权限
    ('system:permission:view', '查看权限', 'menu', '/api/permissions', 0, 9, 'AUTHENTICATED'),
    ('system:permission:add', '新增权限', 'button', '/api/permissions', 0, 10, 'AUTHENTICATED'),
    ('system:permission:edit', '编辑权限', 'button', '/api/permissions', 0, 11, 'AUTHENTICATED'),
    ('system:permission:delete', '删除权限', 'button', '/api/permissions', 0, 12, 'AUTHENTICATED'),
    -- 公开访问资源
    ('public:login', '登录页面', 'page', '/login.html', 0, 13, 'PUBLIC'),
    ('public:index', '首页', 'page', '/index.html', 0, 14, 'PUBLIC'),
    ('public:chat', '智能助手', 'page', '/chat.html', 0, 15, 'PUBLIC'),
    ('public:css', '样式文件', 'static', '/css/**', 0, 16, 'PUBLIC'),
    ('public:js', '脚本文件', 'static', '/js/**', 0, 17, 'PUBLIC'),
    ('public:auth_api', '认证接口', 'api', '/api/auth/**', 0, 18, 'PUBLIC');

-- 插入页面访问权限
INSERT INTO sys_permission (permission_code, permission_name, resource_type, resource_url, parent_id, sort_order, auth_type, status) VALUES
    ('public:users_page', '用户管理页面', 'page', '/users.html', 0, 19, 'PUBLIC', 1),
    ('public:roles_page', '角色管理页面', 'page', '/roles.html', 0, 20, 'PUBLIC', 1),
    ('public:permissions_page', '权限管理页面', 'page', '/permissions.html', 0, 21, 'PUBLIC', 1)
    ON CONFLICT (permission_code) DO NOTHING;

-- 关联管理员用户与超级管理员角色
INSERT INTO sys_user_role (user_id, role_id) VALUES (1, 1);

-- 为超级管理员角色分配所有权限
INSERT INTO sys_role_permission (role_id, permission_id) SELECT 1, id FROM sys_permission;

-- ============================================
-- 智能问答工作台相关表
-- ============================================

-- 聊天会话表：存储用户与AI的对话会话信息
CREATE TABLE IF NOT EXISTS chat_session (
    id BIGSERIAL PRIMARY KEY,                              -- 主键ID，自增
    session_id VARCHAR(64) NOT NULL,                       -- 会话ID，业务主键（系统生成的UUID）
    user_id BIGINT NOT NULL,                               -- 用户ID，关联sys_user表
    session_name VARCHAR(200),                             -- 会话名称（通常取第一条消息的前20个字符）
    conversation_id VARCHAR(100),                          -- Dify平台返回的对话ID，用于保持多轮对话上下文
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,       -- 会话创建时间
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,       -- 最后消息更新时间
    deleted SMALLINT DEFAULT 0,                            -- 逻辑删除标识：0-未删除，1-已删除
    CONSTRAINT uk_session_user UNIQUE(session_id, user_id) -- 唯一约束：同一用户不能有重复的会话ID
    );

-- 聊天消息表：存储会话中的具体消息内容
CREATE TABLE IF NOT EXISTS chat_message (
    id BIGSERIAL PRIMARY KEY,                              -- 主键ID，自增
    session_id VARCHAR(64) NOT NULL,                       -- 会话ID，关联chat_session表
    user_id BIGINT NOT NULL,                               -- 用户ID，关联sys_user表
    message_type VARCHAR(20) NOT NULL,                     -- 消息类型：user-用户消息，assistant-AI回复
    content TEXT NOT NULL,                                 -- 消息内容（支持长文本）
    dify_message_id VARCHAR(100),                          -- Dify平台返回的消息ID
    parent_message_id VARCHAR(100),                        -- 父消息ID，用于消息引用或回复
    sort_order INT DEFAULT 0,                              -- 消息排序号，同一会话内按此字段排序
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,       -- 消息创建时间
    deleted SMALLINT DEFAULT 0                             -- 逻辑删除标识：0-未删除，1-已删除
    );

-- 为消息表添加索引，优化查询性能
CREATE INDEX IF NOT EXISTS idx_chat_message_session ON chat_message(session_id, user_id);        -- 会话+用户联合索引
CREATE INDEX IF NOT EXISTS idx_chat_message_sort ON chat_message(session_id, user_id, sort_order);  -- 排序查询索引
