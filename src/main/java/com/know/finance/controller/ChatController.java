package com.know.finance.controller;

import com.know.finance.dto.ApiResponse;
import com.know.finance.dto.ChatRequest;
import com.know.finance.dto.ChatResponse;
import com.know.finance.dto.SessionInfo;
import com.know.finance.entity.ChatMessage;
import com.know.finance.security.CustomUserDetails;
import com.know.finance.service.ChatService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping("/send")
    public ApiResponse<ChatResponse> sendMessage(
            @RequestBody ChatRequest request,
            Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        ChatResponse response = chatService.sendMessage(userDetails.getUserId(), request);
        return ApiResponse.success(response);
    }

    @PostMapping("/send/stream")
    public SseEmitter sendMessageStream(
            @RequestBody ChatRequest request,
            Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        SseEmitter emitter = new SseEmitter(60_000L);

        chatService.sendMessageStream(userDetails.getUserId(), request, emitter);

        return emitter;
    }

    @GetMapping("/sessions")
    public ApiResponse<List<SessionInfo>> getUserSessions(Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        List<SessionInfo> sessions = chatService.getUserSessions(userDetails.getUserId());
        return ApiResponse.success(sessions);
    }

    @GetMapping("/messages/{sessionId}")
    public ApiResponse<List<ChatMessage>> getSessionMessages(
            @PathVariable String sessionId,
            Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        List<ChatMessage> messages = chatService.getSessionMessages(userDetails.getUserId(), sessionId);
        return ApiResponse.success(messages);
    }

    @DeleteMapping("/session/{sessionId}")
    public ApiResponse<Void> deleteSession(
            @PathVariable String sessionId,
            Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        chatService.deleteSession(userDetails.getUserId(), sessionId);
        return ApiResponse.success(null);
    }
}
