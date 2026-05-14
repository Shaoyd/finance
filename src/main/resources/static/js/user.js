let currentPage = 1;
let pageSize = 10;
let totalRecords = 0;
let isEdit = false;
let currentUserId = null;
let allRoles = [];
let customerManagers = [];

async function initUserPage() {
    await loadUsers();
    await loadCustomerManagers();
    setupFormSubmit();
}

async function loadCustomerManagers() {
    try {
        const result = await apiRequest('/api/users/managers');
        if (result.code === 200) {
            customerManagers = result.data || [];
        }
    } catch (error) {
        console.error('加载客户经理列表失败:', error);
    }
}

function handleUserTypeChange() {
    const userType = document.getElementById('userType').value;
    const employeeNumberGroup = document.getElementById('employeeNumberGroup');
    const managerGroup = document.getElementById('managerGroup');
    const employeeNumber = document.getElementById('employeeNumber');
    const managerId = document.getElementById('managerId');

    if (userType === 'CUSTOMER_MANAGER') {
        employeeNumberGroup.style.display = 'block';
        managerGroup.style.display = 'none';
        employeeNumber.required = true;
        managerId.required = false;
        managerId.value = '';
    } else if (userType === 'CUSTOMER') {
        employeeNumberGroup.style.display = 'none';
        managerGroup.style.display = 'block';
        employeeNumber.required = false;
        managerId.required = true;
        employeeNumber.value = '';

        populateManagerSelect();
    }
}

function populateManagerSelect() {
    const managerId = document.getElementById('managerId');
    managerId.innerHTML = '<option value="">请选择客户经理</option>';

    customerManagers.forEach(manager => {
        const option = document.createElement('option');
        option.value = manager.id;
        option.textContent = `${manager.realName || manager.username} (${manager.employeeNumber || '无编号'})`;
        managerId.appendChild(option);
    });
}

async function loadUsers() {
    try {
        const result = await apiRequest(`/api/users/page?pageNum=${currentPage}&pageSize=${pageSize}`);
        if (result.code === 200) {
            renderUsers(result.data.list);
            totalRecords = result.data.total;
            renderPagination();
        }
    } catch (error) {
        console.error('加载用户列表失败:', error);
    }
}

function renderUsers(users) {
    const tbody = document.getElementById('userTableBody');
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>${user.realName || '-'}</td>
            <td>${getUserTypeText(user.userType)}</td>
            <td>${user.employeeNumber || '-'}</td>
            <td>${user.email || '-'}</td>
            <td>${user.phone || '-'}</td>
            <td>
                <span class="status-badge ${user.status === 1 ? 'status-active' : 'status-inactive'}">
                    ${user.status === 1 ? '启用' : '禁用'}
                </span>
            </td>
            <td class="action-btns">
                <button class="btn btn-success" data-permission="system:user:edit" onclick="openEditModal(${user.id})">编辑</button>
                <button class="btn btn-warning" data-permission="system:user:edit" onclick="openRoleModal(${user.id}, '${user.username}')">分配角色</button>
                <button class="btn btn-danger" data-permission="system:user:delete" onclick="deleteUser(${user.id}, '${user.username}')">删除</button>
            </td>
        </tr>
    `).join('');

    permissionHelper.hideNoPermissionElements();
}

function getUserTypeText(userType) {
    const typeMap = {
        'CUSTOMER_MANAGER': '客户经理',
        'CUSTOMER': '客户'
    };
    return typeMap[userType] || userType || '-';
}

function renderPagination() {
    const totalPages = Math.ceil(totalRecords / pageSize);
    const pagination = document.getElementById('pagination');

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let html = `
        <button class="page-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>上一页</button>
        <span class="page-info">第 ${currentPage} / ${totalPages} 页，共 ${totalRecords} 条</span>
        <button class="page-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>下一页</button>
    `;

    pagination.innerHTML = html;
}

function goToPage(page) {
    const totalPages = Math.ceil(totalRecords / pageSize);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    loadUsers();
}

function openAddModal() {
    isEdit = false;
    document.getElementById('userFormTitle').textContent = '新增用户';
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    document.getElementById('passwordRequired').style.display = 'inline';
    document.getElementById('password').required = true;

    document.getElementById('userType').value = 'CUSTOMER_MANAGER';
    handleUserTypeChange();

    ModalHelper.open('userFormModal');
}

async function openEditModal(userId) {
    isEdit = true;
    document.getElementById('userFormTitle').textContent = '编辑用户';
    document.getElementById('passwordRequired').style.display = 'none';
    document.getElementById('password').required = false;

    try {
        const result = await apiRequest(`/api/users/${userId}`);
        if (result.code === 200) {
            const user = result.data;
            document.getElementById('userId').value = user.id;
            document.getElementById('username').value = user.username;
            document.getElementById('realName').value = user.realName || '';
            document.getElementById('email').value = user.email || '';
            document.getElementById('phone').value = user.phone || '';
            document.getElementById('userType').value = user.userType || 'CUSTOMER_MANAGER';
            document.getElementById('employeeNumber').value = user.employeeNumber || '';
            document.getElementById('status').value = user.status;

            handleUserTypeChange();

            if (user.userType === 'CUSTOMER' && user.managerId) {
                document.getElementById('managerId').value = user.managerId;
            }

            ModalHelper.open('userFormModal');
        }
    } catch (error) {
        console.error('加载用户信息失败:', error);
        showError('加载用户信息失败');
    }
}

function closeUserFormModal() {
    ModalHelper.close('userFormModal');
}

function setupFormSubmit() {
    document.getElementById('userForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        const userId = document.getElementById('userId').value;
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const realName = document.getElementById('realName').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const userType = document.getElementById('userType').value;
        const employeeNumber = document.getElementById('employeeNumber').value.trim();
        const managerId = document.getElementById('managerId').value;
        const status = parseInt(document.getElementById('status').value);

        if (!username) {
            showError('请输入用户名');
            return;
        }

        if (!isEdit && !password) {
            showError('请输入密码');
            return;
        }

        if (userType === 'CUSTOMER_MANAGER' && !employeeNumber) {
            showError('请输入员工编号');
            return;
        }

        if (userType === 'CUSTOMER' && !managerId) {
            showError('请选择所属客户经理');
            return;
        }

        const userData = {
            username,
            realName,
            email,
            phone,
            userType,
            employeeNumber: userType === 'CUSTOMER_MANAGER' ? employeeNumber : null,
            managerId: userType === 'CUSTOMER' ? parseInt(managerId) : null,
            status
        };

        if (password) {
            userData.password = password;
        }

        try {
            let result;
            if (isEdit) {
                result = await apiRequest(`/api/users/${userId}`, 'PUT', userData);
            } else {
                result = await apiRequest('/api/users', 'POST', userData);
            }

            if (result.code === 200) {
                showSuccess(isEdit ? '用户更新成功' : '用户创建成功');
                closeUserFormModal();
                loadUsers();
            } else {
                showError(result.message || '操作失败');
            }
        } catch (error) {
            console.error('保存用户失败:', error);
            showError('保存用户失败，请稍后重试');
        }
    });
}

async function deleteUser(userId, username) {
    if (!confirm(`确定要删除用户"${username}"吗？`)) return;

    try {
        const result = await apiRequest(`/api/users/${userId}`, 'DELETE');

        if (result.code === 200) {
            showSuccess('用户删除成功');
            loadUsers();
        } else {
            showError(result.message || '删除失败');
        }
    } catch (error) {
        console.error('删除用户失败:', error);
        showError('删除用户失败，请稍后重试');
    }
}

async function openRoleModal(userId, username) {
    if (!permissionHelper.hasPermission('system:role:view')) {
        showError('您没有权限查看角色列表，无法分配角色');
        return;
    }

    currentUserId = userId;
    document.getElementById('currentUserName').value = username;

    try {
        const [rolesResult, userRolesResult] = await Promise.all([
            apiRequest('/api/roles'),
            apiRequest(`/api/users/${userId}/roles`)
        ]);

        if (rolesResult.code === 200 && userRolesResult.code === 200) {
            allRoles = rolesResult.data;
            const userRoleIds = userRolesResult.data;

            const checkboxGroup = document.getElementById('roleCheckboxGroup');
            checkboxGroup.innerHTML = allRoles.map(role => `                <div class="checkbox-item">
                    <input type="checkbox" id="role_${role.id}" value="${role.id}" 
                           ${userRoleIds.includes(role.id) ? 'checked' : ''}>
                    <label for="role_${role.id}">${role.roleName} (${role.roleCode})</label>
                </div>
            `).join('');

            ModalHelper.open('roleModal');
        } else {
            if (rolesResult.code === 403) {
                showError('您没有权限查看角色列表');
            } else {
                showError('加载数据失败');
            }
        }
    } catch (error) {
        console.error('加载角色信息失败:', error);
        showError('网络错误，请稍后重试');
    }
}

function closeRoleModal() {
    ModalHelper.close('roleModal');
}

async function saveUserRoles() {
    const checkboxes = document.querySelectorAll('#roleCheckboxGroup input[type="checkbox"]:checked');
    const roleIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

    try {
        const result = await apiRequest(`/api/users/${currentUserId}/roles`, 'PUT', roleIds);

        if (result.code === 200) {
            showSuccess('角色分配成功');
            closeRoleModal();
        } else {
            showError(result.message || '角色分配失败');
        }
    } catch (error) {
        console.error('保存角色失败:', error);
        showError('保存角色失败，请稍后重试');
    }
}
