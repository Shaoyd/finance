package com.know.finance.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SessionInfo {
    private String sessionId;
    private String sessionName;
    private java.time.LocalDateTime createTime;
    private java.time.LocalDateTime updateTime;
}