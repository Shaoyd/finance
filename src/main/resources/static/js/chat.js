const token = localStorage.getItem('token');
let currentSessionId = null;
let isLoading = false;

if (!token) {
    window.location.href = '/login.html';
}

window.onload = function() {
    loadSessions();
    document.getElementById('messageInput').focus();
};

async function loadSessions() {
    try {
        const response = await fetch('/api/chat/sessions', {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        const result = await response.json();
        if (result.code === 200) {
            renderSessions(result.data);
        }
    } catch (error) {
        console.error('加载会话列表失败:', error);
    }
}

function renderSessions(sessions) {
    const sessionList = document.getElementById('sessionList');

    if (sessions.length === 0) {
        sessionList.innerHTML = '<div style="padding: 20px; text-align: center; color: #999; font-size: 13px;">暂无对话记录</div>';
        return;
    }

    sessionList.innerHTML = sessions.map(session => `
        <div class="session-item ${currentSessionId === session.sessionId ? 'active' : ''}" 
             onclick="selectSession('${session.sessionId}')">
            <div class="session-name">${escapeHtml(session.sessionName)}</div>
            <button class="session-delete" onclick="event.stopPropagation(); deleteSession('${session.sessionId}')">×</button>
        </div>
    `).join('');
}

function selectSession(sessionId) {
    currentSessionId = sessionId;
    loadSessions();
    loadMessages(sessionId);
}

async function loadMessages(sessionId) {
    try {
        const response = await fetch(`/api/chat/messages/${sessionId}`, {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        const result = await response.json();
        if (result.code === 200) {
            renderMessages(result.data);
        }
    } catch (error) {
        console.error('加载消息失败:', error);
    }
}

function renderMessages(messages) {
    const chatMessages = document.getElementById('chatMessages');

    if (messages.length === 0) {
        chatMessages.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💬</div>
                <div class="empty-state-text">开始新的对话</div>
                <div class="empty-state-subtext">输入您的问题，我将竭诚为您服务</div>
            </div>
        `;
        return;
    }

    chatMessages.innerHTML = messages.map(msg => `
        <div class="message ${msg.messageType}">
            <div class="message-avatar">${msg.messageType === 'user' ? '👤' : '🤖'}</div>
            <div>
                <div class="message-content">${formatMessage(msg.content)}</div>
                <div class="message-time">${formatTime(msg.createTime)}</div>
            </div>
        </div>
    `).join('');

    scrollToBottom();
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();

    if (!message || isLoading) return;

    isLoading = true;
    updateSendButton();

    if (!currentSessionId) {
        currentSessionId = null;
    }

    appendMessage('user', message);
    input.value = '';
    adjustTextareaHeight(input);

    const assistantMessageDiv = showTypingIndicator();

    try {
        const response = await fetch('/api/chat/send/stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                sessionId: currentSessionId,
                message: message
            })
        });

        if (!response.ok) {
            throw new Error('网络请求失败');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullContent = '';
        let conversationId = null;
        let messageId = null;

        while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {

                if (line.startsWith('event:')) {
                } else if (line.startsWith('data:')) {
                    const dataStr = line.substring(5).trim();

                    if (dataStr && dataStr !== '[DONE]') {
                        try {
                            const data = JSON.parse(dataStr);

                            if (data.content) {
                                fullContent += data.content;
                                updateAssistantMessage(assistantMessageDiv, fullContent);
                            }

                            if (data.conversationId && !conversationId) {
                                conversationId = data.conversationId;
                            }

                            if (data.messageId) {
                                messageId = data.messageId;
                            }

                            if (data.sessionId && !currentSessionId) {
                                currentSessionId = data.sessionId;
                                loadSessions();
                            }

                            if (data.done) {
                                scrollToBottom();
                            }
                        } catch (e) {
                            console.error('解析 SSE 数据失败:', e, '原始数据:', dataStr);
                        }
                    }
                }
            }
        }

        console.log('对话结束 - sessionId:', currentSessionId, 'conversationId:', conversationId);
    } catch (error) {
        console.error('发送消息失败:', error);
        removeTypingIndicator();
        appendMessage('assistant', '抱歉，发送消息失败，请稍后重试。');
    } finally {
        isLoading = false;
        updateSendButton();
    }
}


function appendMessage(type, content) {
    const chatMessages = document.getElementById('chatMessages');
    const emptyState = chatMessages.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.innerHTML = `
        <div class="message-avatar">${type === 'user' ? '👤' : '🤖'}</div>
        <div>
            <div class="message-content">${formatMessage(content)}</div>
            <div class="message-time">${formatTime(new Date())}</div>
        </div>
    `;

    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function showTypingIndicator() {
    const chatMessages = document.getElementById('chatMessages');
    const emptyState = chatMessages.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }

    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div>
            <div class="message-content" id="streamingContent">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        </div>
    `;
    chatMessages.appendChild(typingDiv);
    scrollToBottom();

    return typingDiv;
}

function updateAssistantMessage(typingDiv, content) {
    if (!typingDiv) return;

    const contentDiv = typingDiv.querySelector('#streamingContent');
    if (contentDiv) {
        contentDiv.innerHTML = formatMessage(content);
        scrollToBottom();
    }
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

async function createNewSession() {
    currentSessionId = null;
    loadSessions();

    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">💬</div>
            <div class="empty-state-text">开始新的对话</div>
            <div class="empty-state-subtext">输入您的问题，我将竭诚为您服务</div>
        </div>
    `;

    document.getElementById('messageInput').focus();
}

async function deleteSession(sessionId) {
    if (!confirm('确定要删除这个对话吗？')) return;

    try {
        const response = await fetch(`/api/chat/session/${sessionId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        const result = await response.json();
        if (result.code === 200) {
            if (currentSessionId === sessionId) {
                createNewSession();
            } else {
                loadSessions();
            }
        }
    } catch (error) {
        console.error('删除会话失败:', error);
        alert('删除会话失败，请稍后重试');
    }
}

function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

function updateSendButton() {
    const sendBtn = document.getElementById('sendBtn');
    sendBtn.disabled = isLoading;
    sendBtn.innerHTML = isLoading ? '<span class="loading"></span>' : '发送';
}

function scrollToBottom() {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatMessage(content) {
    return escapeHtml(content).replace(/\n/g, '<br>');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime(timeStr) {
    const date = new Date(timeStr);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) {
        return '刚刚';
    } else if (diff < 3600000) {
        return Math.floor(diff / 60000) + '分钟前';
    } else if (diff < 86400000) {
        return Math.floor(diff / 3600000) + '小时前';
    } else {
        return date.toLocaleDateString('zh-CN') + ' ' +
            date.toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'});
    }
}

function adjustTextareaHeight(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
}

document.getElementById('messageInput').addEventListener('input', function() {
    adjustTextareaHeight(this);
});
