package com.know.finance.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ChatSession {
    private Long id;
    private String sessionId;
    private Long userId;
    private String sessionName;
    private String conversationId;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    private Integer deleted;
}
