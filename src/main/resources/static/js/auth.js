class PermissionHelper {
    constructor() {
        this.permissions = this.loadPermissions();
    }

    loadPermissions() {
        const perms = localStorage.getItem('permissions');
        return perms ? JSON.parse(perms) : [];
    }

    hasPermission(permissionCode) {
        return this.permissions.includes(permissionCode);
    }

    hasAnyPermission(permissionCodes) {
        return permissionCodes.some(code => this.hasPermission(code));
    }

    hasAllPermissions(permissionCodes) {
        return permissionCodes.every(code => this.hasPermission(code));
    }

    filterByPermission(elements) {
        return elements.filter(el => {
            const requiredPerm = el.getAttribute('data-permission');
            if (!requiredPerm) return true;
            return this.hasPermission(requiredPerm);
        });
    }

    hideNoPermissionElements() {
        document.querySelectorAll('[data-permission]').forEach(el => {
            const requiredPerm = el.getAttribute('data-permission');
            if (!this.hasPermission(requiredPerm)) {
                el.style.display = 'none';
                el.classList.add('no-permission');
            }
        });
    }

    showNoPermissionMessage(containerId, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #999;">
                    <div style="font-size: 48px; margin-bottom: 20px;">🔒</div>
                    <div style="font-size: 16px;">${message || '您没有权限访问此内容'}</div>
                </div>
            `;
        }
    }
}

const permissionHelper = new PermissionHelper();
