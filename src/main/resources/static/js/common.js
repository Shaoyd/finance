class PageHelper {
    constructor(options) {
        this.currentPage = 1;
        this.pageSize = options.pageSize || 10;
        this.totalPages = 1;
        this.apiUrl = options.apiUrl;
        this.token = parent.localStorage.getItem('token');
        this.renderTable = options.renderTable;
        this.afterLoad = options.afterLoad || null;
    }

    async load() {
        try {
            const response = await fetch(`${this.apiUrl}?pageNum=${this.currentPage}&pageSize=${this.pageSize}`, {
                headers: {
                    'Authorization': 'Bearer ' + this.token
                }
            });
            const result = await response.json();

            if (result.code === 200) {
                this.renderTable(result.data.list);
                this.renderPagination(result.data);
                if (this.afterLoad) {
                    this.afterLoad(result.data);
                }
            }
        } catch (error) {
            console.error('加载数据失败:', error);
        }
    }

    renderPagination(data) {
        this.totalPages = data.pages;
        const pagination = document.getElementById('pagination');

        let html = `
            <div class="pagination-info">
                共 ${data.total} 条记录，第 ${data.pageNum}/${data.pages} 页
            </div>
            <div class="pagination-controls">
                <button class="page-btn" onclick="pageHelper.changePage(1)" ${this.currentPage === 1 ? 'disabled' : ''}>首页</button>
                <button class="page-btn" onclick="pageHelper.changePage(${this.currentPage - 1})" ${this.currentPage === 1 ? 'disabled' : ''}>上一页</button>
                <span class="page-numbers">`;

        for (let i = 1; i <= data.pages; i++) {
            if (i === 1 || i === data.pages || (i >= this.currentPage - 1 && i <= this.currentPage + 1)) {
                html += `<button class="page-btn ${i === this.currentPage ? 'active' : ''}" onclick="pageHelper.changePage(${i})">${i}</button>`;
            } else if (i === this.currentPage - 2 || i === this.currentPage + 2) {
                html += `<span class="ellipsis">...</span>`;
            }
        }

        html += `</span>
                <button class="page-btn" onclick="pageHelper.changePage(${this.currentPage + 1})" ${this.currentPage === data.pages ? 'disabled' : ''}>下一页</button>
                <button class="page-btn" onclick="pageHelper.changePage(${data.pages})" ${this.currentPage === data.pages ? 'disabled' : ''}>末页</button>
                <select class="page-size-select" onchange="pageHelper.changePageSize(this.value)">
                    <option value="10" ${this.pageSize === 10 ? 'selected' : ''}>10条/页</option>
                    <option value="20" ${this.pageSize === 20 ? 'selected' : ''}>20条/页</option>
                    <option value="50" ${this.pageSize === 50 ? 'selected' : ''}>50条/页</option>
                    <option value="100" ${this.pageSize === 100 ? 'selected' : ''}>100条/页</option>
                </select>
            </div>
        `;

        pagination.innerHTML = html;
    }

    changePage(page) {
        if (page < 1 || page > this.totalPages) return;
        this.currentPage = page;
        this.load();
    }

    changePageSize(size) {
        this.pageSize = parseInt(size);
        this.currentPage = 1;
        this.load();
    }

    refresh() {
        this.load();
    }
}

class ModalHelper {
    static open(modalId) {
        document.getElementById(modalId).style.display = 'block';
    }

    static close(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    static setupAutoClose(modalId) {
        window.onclick = function(event) {
            const modal = document.getElementById(modalId);
            if (event.target === modal) {
                ModalHelper.close(modalId);
            }
        };
    }
}

async function apiRequest(url, method = 'GET', data = null) {
    const token = parent.localStorage.getItem('token');
    const options = {
        method: method,
        headers: {
            'Authorization': 'Bearer ' + token
        }
    };

    if (data && (method === 'POST' || method === 'PUT')) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    return await response.json();
}

function showSuccess(message) {
    alert(message);
}

function showError(message) {
    alert('操作失败：' + message);
}

function confirmAction(message) {
    return confirm(message);
}

function renderWithPermission(htmlTemplate, requiredPermission) {
    if (!requiredPermission || permissionHelper.hasPermission(requiredPermission)) {
        return htmlTemplate;
    }
    return '';
}

function hideElementByPermission(selector, requiredPermission) {
    const element = document.querySelector(selector);
    if (element && !permissionHelper.hasPermission(requiredPermission)) {
        element.style.display = 'none';
    }
}

function showElementByPermission(selector, requiredPermission) {
    const element = document.querySelector(selector);
    if (element && permissionHelper.hasPermission(requiredPermission)) {
        element.style.display = '';
    }
}
