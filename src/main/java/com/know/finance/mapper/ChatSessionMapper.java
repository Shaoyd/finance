package com.know.finance.mapper;

import com.know.finance.entity.ChatSession;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface ChatSessionMapper {

    void insert(ChatSession session);

    ChatSession findBySessionIdAndUserId(@Param("sessionId") String sessionId,
                                         @Param("userId") Long userId);

    List<ChatSession> findByUserId(@Param("userId") Long userId);

    void updateSessionName(@Param("sessionId") String sessionId,
                           @Param("userId") Long userId,
                           @Param("sessionName") String sessionName);

    void updateConversationId(@Param("sessionId") String sessionId,
                              @Param("userId") Long userId,
                              @Param("conversationId") String conversationId);

    void deleteBySessionIdAndUserId(@Param("sessionId") String sessionId,
                                    @Param("userId") Long userId);
}
