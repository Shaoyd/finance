package com.know.finance.service;

import com.know.finance.dto.ChatRequest;
import com.know.finance.dto.ChatResponse;
import com.know.finance.dto.SessionInfo;
import com.know.finance.entity.ChatMessage;
import com.know.finance.entity.ChatSession;
import com.know.finance.mapper.ChatMessageMapper;
import com.know.finance.mapper.ChatSessionMapper;
import com.know.finance.util.DifyApiClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Slf4j
@Service
public class ChatService {

    private final ChatSessionMapper chatSessionMapper;
    private final ChatMessageMapper chatMessageMapper;
    private final DifyApiClient difyApiClient;

    public ChatService(ChatSessionMapper chatSessionMapper,
                       ChatMessageMapper chatMessageMapper,
                       DifyApiClient difyApiClient) {
        this.chatSessionMapper = chatSessionMapper;
        this.chatMessageMapper = chatMessageMapper;
        this.difyApiClient = difyApiClient;
    }

    public List<SessionInfo> getUserSessions(Long userId) {
        List<ChatSession> sessions = chatSessionMapper.findByUserId(userId);
        return sessions.stream().map(session -> {
            SessionInfo info = new SessionInfo();
            info.setSessionId(session.getSessionId());
            info.setSessionName(session.getSessionName());
            info.setCreateTime(session.getCreateTime());
            info.setUpdateTime(session.getUpdateTime());
            return info;
        }).collect(Collectors.toList());
    }

    public ChatResponse sendMessage(Long userId, ChatRequest request) {
        SessionContext context = prepareSession(userId, request, false);
        saveUserMessage(context, request.getMessage(), userId);

        DifyApiClient.DifyResponse difyResponse = difyApiClient.sendBlockingMessage(
                request.getMessage(),
                "user_" + userId,
                context.difyConversationId
        );

        saveConversationIdIfNeeded(context, difyResponse.getConversationId(), userId);
        saveAssistantMessage(context, difyResponse.getContent(), userId);

        log.info("消息处理完成: sessionId={}, conversationId={}", context.sessionId, difyResponse.getConversationId());

        return new ChatResponse(
                context.sessionId,
                difyResponse.getConversationId(),
                "msg_" + (context.messageCount + 1),
                difyResponse.getContent(),
                System.currentTimeMillis()
        );
    }

    public void sendMessageStream(Long userId, ChatRequest request, SseEmitter emitter) {
        SessionContext context = prepareSession(userId, request, true);
        saveUserMessage(context, request.getMessage(), userId);

        setupEmitterCallbacks(emitter, context.sessionId);

        CompletableFuture.runAsync(() -> {
            try {
                String[] conversationIdWrapper = new String[1];
                StringBuilder fullContent = new StringBuilder();

                difyApiClient.sendStreamingMessage(
                        request.getMessage(),
                        "user_" + userId,
                        context.difyConversationId,
                        (chunk, convId) -> {
                            try {
                                if (chunk != null && !chunk.isEmpty()) {
                                    fullContent.append(chunk);
                                }

                                if (convId != null && conversationIdWrapper[0] == null) {
                                    conversationIdWrapper[0] = convId;
                                    log.debug("首次获取到 conversationId: {}", convId);
                                }

                                if (chunk != null && !chunk.isEmpty()) {
                                    Map<String, Object> data = new HashMap<>();
                                    data.put("content", chunk);
                                    data.put("sessionId", context.sessionId);
                                    data.put("conversationId", conversationIdWrapper[0]);
                                    data.put("messageId", "msg_" + (context.messageCount + fullContent.length()));
                                    emitter.send(SseEmitter.event()
                                            .name("message")
                                            .data(data));
                                }
                            } catch (Exception e) {
                                log.error("发送 SSE 事件失败", e);
                            }
                        }
                );

                saveConversationIdIfNeeded(context, conversationIdWrapper[0], userId);
                saveAssistantMessage(context, fullContent.toString(), userId);

                Map<String, Object> doneData = new HashMap<>();
                doneData.put("done", true);
                doneData.put("sessionId", context.sessionId);
                doneData.put("conversationId", conversationIdWrapper[0]);
                doneData.put("messageCount", context.messageCount + 1);
                emitter.send(SseEmitter.event()
                        .name("done")
                        .data(doneData));

                emitter.complete();
                log.info("流式消息处理完成: sessionId={}, conversationId={}",
                        context.sessionId, conversationIdWrapper[0]);

            } catch (Exception e) {
                log.error("流式消息处理失败: sessionId={}", context.sessionId, e);
                emitter.completeWithError(e);
            }
        });
    }

    private SessionContext prepareSession(Long userId, ChatRequest request, boolean isStream) {
        String sessionId = request.getSessionId();
        boolean isNewSession = false;
        ChatSession session = null;

        if (sessionId == null || sessionId.isEmpty()) {
            sessionId = UUID.randomUUID().toString().replace("-", "");
            String sessionName = request.getMessage().substring(0, Math.min(20, request.getMessage().length()));

            session = new ChatSession();
            session.setSessionId(sessionId);
            session.setUserId(userId);
            session.setSessionName(sessionName);
            chatSessionMapper.insert(session);

            isNewSession = true;
            log.info("创建新会话{}: sessionId={}, userId={}", isStream ? "（流式）" : "", sessionId, userId);
        } else {
            session = chatSessionMapper.findBySessionIdAndUserId(sessionId, userId);
            if (session == null) {
                throw new RuntimeException("会话不存在");
            }
        }

        return new SessionContext(
                sessionId,
                session.getConversationId(),
                chatMessageMapper.countBySessionIdAndUserId(sessionId, userId),
                isNewSession
        );
    }

    private void saveUserMessage(SessionContext context, String content, Long userId) {
        ChatMessage userMessage = new ChatMessage();
        userMessage.setSessionId(context.sessionId);
        userMessage.setUserId(userId);
        userMessage.setMessageType("user");
        userMessage.setContent(content);
        userMessage.setSortOrder(context.messageCount);
        chatMessageMapper.insert(userMessage);
    }

    private void saveConversationIdIfNeeded(SessionContext context, String conversationId, Long userId) {
        if (context.isNewSession && conversationId != null) {
            chatSessionMapper.updateConversationId(context.sessionId, userId, conversationId);
            log.info("保存 Dify conversation_id: sessionId={}, conversationId={}", context.sessionId, conversationId);
        }
    }

    private void saveAssistantMessage(SessionContext context, String content, Long userId) {
        ChatMessage aiMessage = new ChatMessage();
        aiMessage.setSessionId(context.sessionId);
        aiMessage.setUserId(userId);
        aiMessage.setMessageType("assistant");
        aiMessage.setContent(content);
        aiMessage.setSortOrder(context.messageCount + 1);
        chatMessageMapper.insert(aiMessage);
    }

    private void setupEmitterCallbacks(SseEmitter emitter, String sessionId) {
        emitter.onCompletion(() -> log.info("SSE 连接完成: sessionId={}", sessionId));
        emitter.onTimeout(() -> {
            log.warn("SSE 连接超时: sessionId={}", sessionId);
            emitter.complete();
        });
        emitter.onError((ex) -> log.error("SSE 连接错误: sessionId={}", sessionId, ex));
    }

    public List<ChatMessage> getSessionMessages(Long userId, String sessionId) {
        return chatMessageMapper.findBySessionIdAndUserId(sessionId, userId);
    }

    public void deleteSession(Long userId, String sessionId) {
        chatSessionMapper.deleteBySessionIdAndUserId(sessionId, userId);
        chatMessageMapper.deleteBySessionIdAndUserId(sessionId, userId);
        log.info("删除会话: sessionId={}, userId={}", sessionId, userId);
    }

    private static class SessionContext {
        final String sessionId;
        final String difyConversationId;
        final int messageCount;
        final boolean isNewSession;

        SessionContext(String sessionId, String difyConversationId, int messageCount, boolean isNewSession) {
            this.sessionId = sessionId;
            this.difyConversationId = difyConversationId;
            this.messageCount = messageCount;
            this.isNewSession = isNewSession;
        }
    }
}
