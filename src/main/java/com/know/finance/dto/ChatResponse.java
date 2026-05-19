package com.know.finance.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ChatResponse {
    private String sessionId;
    private String conversationId;
    private String messageId;
    private String content;
    private String thinkContent;
    private Long timestamp;
}