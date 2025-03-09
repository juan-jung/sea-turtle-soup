package com.example.seaturtlesoup.service;

import com.example.seaturtlesoup.domain.Prompt;
import com.example.seaturtlesoup.domain.type.DifficultyType;
import com.example.seaturtlesoup.domain.type.PromptType;
import com.example.seaturtlesoup.dto.AIQueryDto;
import com.example.seaturtlesoup.dto.AIQueryResultDto;
import com.example.seaturtlesoup.dto.NewProblemDto;
import com.example.seaturtlesoup.repository.PromptRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import javax.persistence.EntityNotFoundException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RequiredArgsConstructor
@Service
public class AIService {

    private final PromptRepository promptRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${openai.api.url}")
    private String apiUrl;

    @Value("${openai.api.key}")
    private String apiKey;

    @Value("${openai.model.name}")
    private String modelName;
    public AIQueryResultDto query(AIQueryDto dto) {
        try {
            Prompt prompt = promptRepository.findByType(PromptType.QUESTION_RESPONSE)
                    .orElseThrow(() -> new EntityNotFoundException("Question response prompt not found"));

            // Construct the full prompt with user's question
            String fullPrompt = prompt.getContent()
                    .replace("{content}", dto.content())
                    .replace("{answer}", dto.answer())
                    .replace("{question}", dto.question());

            // OpenAI API 호출
            String apiResponse = callChatGptApi(fullPrompt);

            // 응답에서 JSON 추출 (OpenAI의 응답 내부에 JSON이 있음)
            JsonNode jsonNode = objectMapper.readTree(apiResponse);
            String content = jsonNode.get("choices").get(0).get("message").get("content").asText().trim();

            // JSON 문자열에서 시작과 끝 부분의 ```json과 ``` 제거 (필요한 경우)
            if (content.startsWith("```json")) {
                content = content.substring(7);
            }
            if (content.endsWith("```")) {
                content = content.substring(0, content.length() - 3);
            }
            content = content.trim();

            // 응답 파싱
            JsonNode gameResponse = objectMapper.readTree(content);
            boolean isAnswer = gameResponse.get("isAnswer").asBoolean();
            String queryResult = gameResponse.get("queryResult").asText();

            return new AIQueryResultDto(isAnswer, queryResult, dto.answer());
        } catch (Exception e) {
            return new AIQueryResultDto(false, "게임 처리 중 오류가 발생했습니다: " + e.getMessage(), dto.answer());
        }
    }

    public NewProblemDto make(DifficultyType difficulty) {
        try {
            Prompt entity = promptRepository.findByType(PromptType.STORY_GENERATION)
                    .orElseThrow(() -> new EntityNotFoundException("Story generation prompt not found"));

            String prompt = entity.getContent().replace("{difficulty}", difficulty.toString());
            String response = callChatGptApi(prompt);

            JsonNode jsonNode = objectMapper.readTree(response);
            String content = jsonNode.get("choices").get(0).get("message").get("content").asText();

            // JSON 문자열에서 시작과 끝 부분의 ```json과 ``` 제거 (필요한 경우)
            if (content.startsWith("```json")) {
                content = content.substring(7);
            }
            if (content.endsWith("```")) {
                content = content.substring(0, content.length() - 3);
            }
            content = content.trim();

            JsonNode storyNode = objectMapper.readTree(content);

            String title = storyNode.has("title") ? storyNode.get("title").asText() : "Default Title";
            String storyContent = storyNode.has("content") ? storyNode.get("content").asText() : "Default Content";
            String answer = storyNode.has("answer") ? storyNode.get("answer").asText() : "Default Answer";

            return new NewProblemDto(title, storyContent, answer);
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate problem: " + e.getMessage(), e);
        }
    }

    private String callChatGptApi(String prompt) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + apiKey);

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(createMessage("system", "당신은 바다거북스프 게임의 AI 마스터입니다. JSON 형식으로만 응답해야 합니다."));
        messages.add(createMessage("user", prompt));

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", modelName);
        requestBody.put("messages", messages);
        requestBody.put("temperature", 0.7);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            return restTemplate.postForObject(apiUrl, entity, String.class);
        } catch (RestClientException e) {
            throw new RuntimeException("Failed to call OpenAI API: " + e.getMessage(), e);
        }
    }

    private Map<String, String> createMessage(String role, String content) {
        Map<String, String> message = new HashMap<>();
        message.put("role", role);
        message.put("content", content);
        return message;
    }
}
