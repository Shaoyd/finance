package com.know.finance.mapper;

import com.know.finance.entity.ChatMessage;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface ChatMessageMapper {

    void insert(ChatMessage message);

    List<ChatMessage> findBySessionIdAndUserId(@Param("sessionId") String sessionId,
                                               @Param("userId") Long userId);

    int countBySessionIdAndUserId(@Param("sessionId") String sessionId,
                                  @Param("userId") Long userId);

    void deleteBySessionIdAndUserId(@Param("sessionId") String sessionId,
                                    @Param("userId") Long userId);
}