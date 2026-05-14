package com.know.finance.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ChatMessage {
    private Long id;
    private String sessionId;
    private Long userId;
    private String messageType;
    private String content;
    private String difyMessageId;
    private String parentMessageId;
    private Integer sortOrder;
    private LocalDateTime createTime;
    private Integer deleted;
}