const token = localStorage.getItem('token');
let currentSessionId = null;
let isLoading = false;
let deepThinkMode = false;

if (!token) {
    window.location.href = '/login.html';
}

window.onload = function() {
    loadSessions();
    document.getElementById('messageInput').focus();

    const deepThinkToggle = document.getElementById('deepThinkToggle');
    if (deepThinkToggle) {
        deepThinkToggle.addEventListener('change', function() {
            deepThinkMode = this.checked;
            localStorage.setItem('deepThinkMode', deepThinkMode);
        });

        const savedMode = localStorage.getItem('deepThinkMode');
        if (savedMode === 'true') {
            deepThinkToggle.checked = true;
            deepThinkMode = true;
        }
    }
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
                message: message,
                deepThink: deepThinkMode
            })
        });

        if (!response.ok) {
            throw new Error('网络请求失败');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullThinkContent = '';
        let fullAnswerContent = '';
        let conversationId = null;
        let messageId = null;
        let currentEventType = null;
        let currentEventData = '';

        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                if (buffer.trim()) {
                    processSSELine(buffer.trim(), (type, data) => {
                        handleSSEEvent(type, data);
                    });
                }
                break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine) continue;

                if (trimmedLine.startsWith('event:')) {
                    currentEventType = trimmedLine.substring(6).trim();
                    currentEventData = '';
                } else if (trimmedLine.startsWith('data:')) {
                    const dataContent = trimmedLine.substring(5).trim();
                    if (dataContent && dataContent !== '[DONE]') {
                        handleSSEEvent(currentEventType, dataContent);
                    }
                }
            }
        }

        function handleSSEEvent(eventType, dataStr) {
            if (!dataStr) return;

            try {
                const data = JSON.parse(dataStr);

                if (eventType === 'thinking') {
                    if (data.content) {
                        fullThinkContent += data.content;
                        updateThinkingDisplay(assistantMessageDiv, fullThinkContent, fullAnswerContent);
                    }
                    if (data.conversationId && !conversationId) {
                        conversationId = data.conversationId;
                    }
                } else if (eventType === 'thinking_end') {
                    if (data.content) {
                        fullThinkContent += data.content;
                    }
                    updateThinkingDisplay(assistantMessageDiv, fullThinkContent, fullAnswerContent);
                } else if (eventType === 'message') {
                    if (data.content) {
                        fullAnswerContent += data.content;
                        if (deepThinkMode) {
                            updateAssistantMessageWithThink(assistantMessageDiv, fullThinkContent, fullAnswerContent);
                        } else {
                            updateAssistantMessage(assistantMessageDiv, fullAnswerContent);
                        }
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
                } else if (eventType === 'done') {
                    scrollToBottom();
                }
            } catch (e) {
                console.error('解析 SSE 数据失败:', e, '原始数据:', dataStr);
            }
        }

        console.log('对话结束 - sessionId:', currentSessionId, 'conversationId:', conversationId, 'hasThink:', fullThinkContent.length > 0);
    } catch (error) {
        console.error('发送消息失败:', error);
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
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
    messageDiv.innerHTML = `        <div class="message-avatar">${type === 'user' ? '👤' : '🤖'}</div>
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
    typingDiv.innerHTML = `        <div class="message-avatar">🤖</div>
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

function updateThinkingDisplay(typingDiv, thinkContent, answerContent) {
    if (!typingDiv) return;

    const contentDiv = typingDiv.querySelector('#streamingContent');
    if (contentDiv) {
        let html = '';
        if (thinkContent) {
            html += '<div class="thinking-section">';
            html += '<div class="thinking-header">💭 深度思考中...</div>';
            html += '<div class="thinking-content">' + formatMessage(thinkContent) + '</div>';
            html += '</div>';
        }
        contentDiv.innerHTML = html;
        scrollToBottom();
    }
}

function updateAssistantMessageWithThink(typingDiv, thinkContent, answerContent) {
    if (!typingDiv) return;

    const contentDiv = typingDiv.querySelector('#streamingContent');
    if (contentDiv) {
        let html = '';

        if (thinkContent) {
            html += '<details class="thinking-section">';
            html += '<summary class="thinking-header">💭 深度思考过程</summary>';
            html += '<div class="thinking-content">' + formatMessage(thinkContent) + '</div>';
            html += '</details>';
        }

        if (answerContent) {
            html += '<div class="answer-section">';
            html += formatMessage(answerContent);
            html += '</div>';
        }

        contentDiv.innerHTML = html;
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
    if (!content) return '';

    const htmlTablePattern = /<!DOCTYPE\s+html[\s\S]*?<table[\s\S]*?<\/table>[\s\S]*?<\/html>/i;
    const tableOnlyPattern = /<table[\s\S]*?<\/table>/i;

    if (htmlTablePattern.test(content)) {
        const tableMatch = content.match(/<table[\s\S]*?<\/table>/i);
        if (tableMatch) {
            const sanitizedTable = sanitizeHtmlTable(tableMatch[0]);
            return `<div class="table-wrapper">${sanitizedTable}</div>`;
        }
    } else if (tableOnlyPattern.test(content)) {
        const tableMatch = content.match(/<table[\s\S]*?<\/table>/i);
        if (tableMatch) {
            const sanitizedTable = sanitizeHtmlTable(tableMatch[0]);
            return `<div class="table-wrapper">${sanitizedTable}</div>`;
        }
    }

    return escapeHtml(content).replace(/\n/g, '<br>');
}

function sanitizeHtmlTable(tableHtml) {
    const allowedTags = ['table', 'thead', 'tbody', 'tr', 'th', 'td', 'caption'];
    let sanitized = tableHtml;

    sanitized = sanitized.replace(/<script[\s\S]*?<\/script>/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=\s*\S+/gi, '');

    const styleMatch = sanitized.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    if (!styleMatch) {
        sanitized = sanitized.replace(/<style[\s\S]*?<\/style>/gi, '');
    }

    sanitized = sanitized.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');
    sanitized = sanitized.replace(/<object[\s\S]*?<\/object>/gi, '');
    sanitized = sanitized.replace(/<embed[\s\S]*?>/gi, '');

    return sanitized;
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
