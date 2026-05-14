let isEdit = false;
let pageHelper;

async function initPermissionPage() {
    pageHelper = new PageHelper({
        apiUrl: '/api/permissions/page',
        pageSize: 10,
        renderTable: renderPermissions
    });

    await pageHelper.load();
    ModalHelper.setupAutoClose('permissionFormModal');
}

function renderPermissions(permissions) {
    const tbody = document.getElementById('permissionTableBody');
    tbody.innerHTML = permissions.map(perm => `        <tr>
            <td>${perm.id}</td>
            <td>${perm.permissionCode}</td>
            <td>${perm.permissionName}</td>
            <td>${perm.resourceType || '-'}</td>
            <td>${perm.resourceUrl || '-'}</td>
            <td>
                <span class="status-badge ${perm.authType === 'PUBLIC' ? 'status-active' : 'status-inactive'}">
                    ${perm.authType === 'PUBLIC' ? '公开访问' : '需要认证'}                </span>
            </td>
            <td>${perm.sortOrder}</td>
            <td>
                <span class="status-badge ${perm.status === 1 ? 'status-active' : 'status-inactive'}">
                    ${perm.status === 1 ? '启用' : '禁用'}                </span>
            </td>
            <td class="action-btns">
                <button class="btn btn-success" data-permission="system:permission:edit" onclick="openEditModal(${perm.id})">编辑</button>
                <button class="btn btn-danger" data-permission="system:permission:delete" onclick="deletePermission(${perm.id}, '${perm.permissionName}')">删除</button>
            </td>
        </tr>
    `).join('');

    permissionHelper.hideNoPermissionElements();
}

function openAddModal() {
    isEdit = false;
    document.getElementById('permissionFormTitle').textContent = '新增权限';
    document.getElementById('permissionId').value = '';
    document.getElementById('permissionCode').value = '';
    document.getElementById('permissionName').value = '';
    document.getElementById('resourceType').value = 'menu';
    document.getElementById('resourceUrl').value = '';
    document.getElementById('authType').value = 'AUTHENTICATED';
    document.getElementById('parentId').value = '0';
    document.getElementById('sortOrder').value = '0';
    document.getElementById('status').value = '1';
    ModalHelper.open('permissionFormModal');
}

async function openEditModal(permissionId) {
    isEdit = true;
    document.getElementById('permissionFormTitle').textContent = '编辑权限';

    try {
        const result = await apiRequest(`/api/permissions/${permissionId}`);

        if (result.code === 200) {
            const perm = result.data;
            document.getElementById('permissionId').value = perm.id;
            document.getElementById('permissionCode').value = perm.permissionCode;
            document.getElementById('permissionName').value = perm.permissionName;
            document.getElementById('resourceType').value = perm.resourceType || 'menu';
            document.getElementById('resourceUrl').value = perm.resourceUrl || '';
            document.getElementById('authType').value = perm.authType || 'AUTHENTICATED';
            document.getElementById('parentId').value = perm.parentId || 0;
            document.getElementById('sortOrder').value = perm.sortOrder || 0;
            document.getElementById('status').value = perm.status;
            ModalHelper.open('permissionFormModal');
        }
    } catch (error) {
        console.error('加载权限信息失败:', error);
        showError('加载权限信息失败');
    }
}

function closePermissionFormModal() {
    ModalHelper.close('permissionFormModal');
}

async function savePermission(e) {
    e.preventDefault();

    const permissionId = document.getElementById('permissionId').value;
    const permissionData = {
        permissionCode: document.getElementById('permissionCode').value,
        permissionName: document.getElementById('permissionName').value,
        resourceType: document.getElementById('resourceType').value,
        resourceUrl: document.getElementById('resourceUrl').value,
        authType: document.getElementById('authType').value,
        parentId: parseInt(document.getElementById('parentId').value),
        sortOrder: parseInt(document.getElementById('sortOrder').value),
        status: parseInt(document.getElementById('status').value)
    };

    try {
        let result;
        if (isEdit) {
            result = await apiRequest(`/api/permissions/${permissionId}`, 'PUT', permissionData);
        } else {
            result = await apiRequest('/api/permissions', 'POST', permissionData);
        }

        if (result.code === 200) {
            showSuccess(isEdit ? '权限更新成功！' : '权限创建成功！');
            closePermissionFormModal();
            pageHelper.refresh();
        } else {
            showError(result.message);
        }
    } catch (error) {
        console.error('保存权限失败:', error);
        showError('网络错误，请稍后重试');
    }
}

async function deletePermission(permissionId, permissionName) {
    if (!confirmAction(`确定要删除权限 "${permissionName}" 吗？`)) {
        return;
    }

    try {
        const result = await apiRequest(`/api/permissions/${permissionId}`, 'DELETE');

        if (result.code === 200) {
            showSuccess('权限删除成功！');
            pageHelper.refresh();
        } else {
            showError(result.message);
        }
    } catch (error) {
        console.error('删除权限失败:', error);
        showError('网络错误，请稍后重试');
    }
}

async function refreshPermissions() {
    try {
        const result = await apiRequest('/api/permissions/refresh', 'POST');

        if (result.code === 200) {
            showSuccess('权限配置刷新成功！新的安全策略已生效。');
        } else {
            showError(result.message);
        }
    } catch (error) {
        console.error('刷新权限配置失败:', error);
        showError('网络错误，请稍后重试');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('permissionForm').addEventListener('submit', savePermission);
});
