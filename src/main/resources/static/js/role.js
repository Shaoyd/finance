let currentRoleId = null;
let allPermissions = [];
let isEdit = false;
let pageHelper;

async function initRolePage() {
    pageHelper = new PageHelper({
        apiUrl: '/api/roles/page',
        pageSize: 10,
        renderTable: renderRoles
    });

    await pageHelper.load();
    ModalHelper.setupAutoClose('roleFormModal');
    ModalHelper.setupAutoClose('permissionModal');
}

function renderRoles(roles) {
    const tbody = document.getElementById('roleTableBody');
    tbody.innerHTML = roles.map(role => `        <tr>
            <td>${role.id}</td>
            <td>${role.roleCode}</td>
            <td>${role.roleName}</td>
            <td>${role.description || '-'}</td>
            <td>
                <span class="status-badge ${role.status === 1 ? 'status-active' : 'status-inactive'}">
                    ${role.status === 1 ? '启用' : '禁用'}                </span>
            </td>
            <td class="action-btns">
                <button class="btn btn-success" data-permission="system:role:edit" onclick="openEditModal(${role.id})">编辑</button>
                <button class="btn btn-primary" data-permission="system:role:edit" onclick="openPermissionModal(${role.id}, '${role.roleName}')">分配权限</button>
                <button class="btn btn-danger" data-permission="system:role:delete" onclick="deleteRole(${role.id}, '${role.roleName}')">删除</button>
            </td>
        </tr>
    `).join('');

    permissionHelper.hideNoPermissionElements();
}

function openAddModal() {
    isEdit = false;
    document.getElementById('roleFormTitle').textContent = '新增角色';
    document.getElementById('roleId').value = '';
    document.getElementById('roleCode').value = '';
    document.getElementById('roleName').value = '';
    document.getElementById('description').value = '';
    document.getElementById('status').value = '1';
    ModalHelper.open('roleFormModal');
}

async function openEditModal(roleId) {
    isEdit = true;
    document.getElementById('roleFormTitle').textContent = '编辑角色';

    try {
        const result = await apiRequest(`/api/roles/${roleId}`);

        if (result.code === 200) {
            const role = result.data;
            document.getElementById('roleId').value = role.id;
            document.getElementById('roleCode').value = role.roleCode;
            document.getElementById('roleName').value = role.roleName;
            document.getElementById('description').value = role.description || '';
            document.getElementById('status').value = role.status;
            ModalHelper.open('roleFormModal');
        }
    } catch (error) {
        console.error('加载角色信息失败:', error);
        showError('加载角色信息失败');
    }
}

function closeRoleFormModal() {
    ModalHelper.close('roleFormModal');
}

async function saveRole(e) {
    e.preventDefault();

    const roleId = document.getElementById('roleId').value;
    const roleData = {
        roleCode: document.getElementById('roleCode').value,
        roleName: document.getElementById('roleName').value,
        description: document.getElementById('description').value,
        status: parseInt(document.getElementById('status').value)
    };

    try {
        let result;
        if (isEdit) {
            result = await apiRequest(`/api/roles/${roleId}`, 'PUT', roleData);
        } else {
            result = await apiRequest('/api/roles', 'POST', roleData);
        }

        if (result.code === 200) {
            showSuccess(isEdit ? '角色更新成功！' : '角色创建成功！');
            closeRoleFormModal();
            pageHelper.refresh();
        } else {
            showError(result.message);
        }
    } catch (error) {
        console.error('保存角色失败:', error);
        showError('网络错误，请稍后重试');
    }
}

async function deleteRole(roleId, roleName) {
    if (!confirmAction(`确定要删除角色 "${roleName}" 吗？`)) {
        return;
    }

    try {
        const result = await apiRequest(`/api/roles/${roleId}`, 'DELETE');

        if (result.code === 200) {
            showSuccess('角色删除成功！');
            pageHelper.refresh();
        } else {
            showError(result.message);
        }
    } catch (error) {
        console.error('删除角色失败:', error);
        showError('网络错误，请稍后重试');
    }
}

async function openPermissionModal(roleId, roleName) {
    if (!permissionHelper.hasPermission('system:permission:view')) {
        showError('您没有权限查看权限列表，无法分配权限');
        return;
    }

    currentRoleId = roleId;
    document.getElementById('currentRoleName').value = roleName;

    try {
        const [permissionsResult, rolePermissionsResult] = await Promise.all([
            apiRequest('/api/permissions'),
            apiRequest(`/api/roles/${roleId}/permissions`)
        ]);

        if (permissionsResult.code === 200 && rolePermissionsResult.code === 200) {
            allPermissions = permissionsResult.data;
            const rolePermissionIds = rolePermissionsResult.data;

            const checkboxGroup = document.getElementById('permissionCheckboxGroup');
            checkboxGroup.innerHTML = allPermissions.map(perm => `
                <div class="checkbox-item">
                    <input type="checkbox" id="perm_${perm.id}" value="${perm.id}" 
                           ${rolePermissionIds.includes(perm.id) ? 'checked' : ''}>
                    <label for="perm_${perm.id}">${perm.permissionName} (${perm.permissionCode})</label>
                </div>
            `).join('');

            ModalHelper.open('permissionModal');
        } else {
            if (rolesResult.code === 403) {
                showError('您没有权限查看权限列表');
            } else {
                showError('加载数据失败');
            }
        }
    } catch (error) {
        console.error('加载权限信息失败:', error);
        showError('网络错误，请稍后重试');
    }
}

function closePermissionModal() {
    ModalHelper.close('permissionModal');
}

async function saveRolePermissions() {
    const checkboxes = document.querySelectorAll('#permissionCheckboxGroup input[type="checkbox"]:checked');
    const permissionIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

    try {
        const result = await apiRequest(`/api/roles/${currentRoleId}/permissions`, 'POST', { permissionIds });

        if (result.code === 200) {
            showSuccess('权限分配成功！');
            closePermissionModal();
        } else {
            showError(result.message);
        }
    } catch (error) {
        console.error('保存权限失败:', error);
        showError('网络错误，请稍后重试');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('roleForm').addEventListener('submit', saveRole);
});
