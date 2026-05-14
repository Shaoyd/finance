package com.know.finance.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
public class DifyApiClient {

    @Value("${dify.api.url:http://1.15.174.233/v1}")
    private String difyApiUrl;

    @Value("${dify.api.key:}")
    private String difyApiKey;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public DifyApiClient() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    public DifyResponse sendBlockingMessage(String query, String user, String conversationId) {
        String url = difyApiUrl + "/chat-messages";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + difyApiKey);

        Map<String, Object> requestBody = buildRequestBody(query, user, conversationId, false);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            log.debug("调用 Dify API (阻塞模式): url={}, conversationId={}", url, conversationId);
            log.debug("请求体: {}", requestBody);

            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);

            log.debug("Dify API 响应状态: {}", response.getStatusCode());
            log.debug("Dify API 响应内容: {}", response.getBody());

            return parseResponse(response.getBody());
        } catch (Exception e) {
            log.error("调用 Dify API 失败: {}", e.getMessage(), e);
            return new DifyResponse("抱歉，AI服务暂时不可用，请稍后重试。", null);
        }
    }

    public void sendStreamingMessage(String query, String user, String conversationId, StreamCallback callback) {
        String url = difyApiUrl + "/chat-messages";

        try {
            log.debug("调用 Dify API (流式模式): url={}, conversationId={}", url, conversationId);

            URL apiUrl = new URL(url);
            HttpURLConnection connection = (HttpURLConnection) apiUrl.openConnection();
            connection.setRequestMethod("POST");
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("Authorization", "Bearer " + difyApiKey);
            connection.setRequestProperty("Accept", "text/event-stream");

            Map<String, Object> requestBody = buildRequestBody(query, user, conversationId, true);
            String jsonInputString = objectMapper.writeValueAsString(requestBody);

            try (java.io.OutputStream os = connection.getOutputStream()) {
                byte[] input = jsonInputString.getBytes(StandardCharsets.UTF_8);
                os.write(input, 0, input.length);
            }

            int responseCode = connection.getResponseCode();
            log.debug("Dify API 响应状态码: {}", responseCode);

            if (responseCode == HttpURLConnection.HTTP_OK) {
                try (InputStream inputStream = connection.getInputStream();
                     BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {

                    String line;
                    String conversationIdFromStream = null;

                    while ((line = reader.readLine()) != null) {
                        if (line.startsWith("data: ")) {
                            String data = line.substring(6);
                            if ("[DONE]".equals(data)) {
                                break;
                            }

                            try {
                                JsonNode jsonNode = objectMapper.readTree(data);

                                if (conversationIdFromStream == null && jsonNode.has("conversation_id")) {
                                    conversationIdFromStream = jsonNode.path("conversation_id").asText();
                                    log.debug("提取到 conversation_id: {}", conversationIdFromStream);
                                }

                                if (jsonNode.has("answer")) {
                                    String chunk = jsonNode.path("answer").asText();
                                    if (!chunk.isEmpty()) {
                                        log.debug("收到文本块: {}", chunk);
                                        callback.onChunk(chunk, conversationIdFromStream);
                                    }
                                }
                            } catch (Exception e) {
                                log.debug("解析流式数据块失败: {}, data={}", e.getMessage(), data);
                            }
                        }
                    }

                    log.debug("流式响应处理完成, conversationId: {}", conversationIdFromStream);
                }
            } else {
                log.error("Dify API 调用失败，响应码: {}", responseCode);
                callback.onChunk("抱歉，AI服务暂时不可用", null);
            }

            connection.disconnect();
        } catch (Exception e) {
            log.error("调用 Dify 流式 API 失败: {}", e.getMessage(), e);
            callback.onChunk("抱歉，AI服务暂时不可用", null);
        }
    }

    private Map<String, Object> buildRequestBody(String query, String user, String conversationId, boolean streaming) {
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("inputs", new HashMap<>());
        requestBody.put("query", query);
        requestBody.put("response_mode", streaming ? "streaming" : "blocking");
        requestBody.put("user", user);

        if (conversationId != null && !conversationId.isEmpty()) {
            requestBody.put("conversation_id", conversationId);
        }

        return requestBody;
    }

    private DifyResponse parseResponse(String response) {
        try {
            JsonNode root = objectMapper.readTree(response);

            String content = null;
            String conversationId = null;

            if (root.has("answer")) {
                content = root.path("answer").asText();
            } else if (root.has("message")) {
                content = root.path("message").asText();
            }

            if (root.has("conversation_id")) {
                conversationId = root.path("conversation_id").asText();
            }

            if (content == null) {
                log.warn("Dify 响应格式异常: {}", response);
                content = "抱歉，无法解析AI响应。";
            }

            return new DifyResponse(content, conversationId);
        } catch (Exception e) {
            log.error("解析 Dify 响应失败: {}", e.getMessage());
            return new DifyResponse("抱歉，AI服务返回数据格式错误。", null);
        }
    }

    @FunctionalInterface
    public interface StreamCallback {
        void onChunk(String chunk, String conversationId);
    }

    public static class DifyResponse {
        private final String content;
        private final String conversationId;

        public DifyResponse(String content, String conversationId) {
            this.content = content;
            this.conversationId = conversationId;
        }

        public String getContent() {
            return content;
        }

        public String getConversationId() {
            return conversationId;
        }
    }
}
