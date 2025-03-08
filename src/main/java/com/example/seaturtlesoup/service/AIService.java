package com.example.seaturtlesoup.service;

import com.example.seaturtlesoup.domain.Prompt;
import com.example.seaturtlesoup.domain.type.PromptType;
import com.example.seaturtlesoup.dto.AIQueryDto;
import com.example.seaturtlesoup.dto.AIQueryResultDto;
import com.example.seaturtlesoup.dto.NewProblemDto;
import com.example.seaturtlesoup.dto.ProblemDto;
import com.example.seaturtlesoup.repository.PromptRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import javax.persistence.EntityNotFoundException;

@RequiredArgsConstructor
@Service
public class AIService {

    private final PromptRepository promptRepository;

    public AIQueryResultDto query(AIQueryDto dto) {
        Prompt prompt = promptRepository.findByType(PromptType.QUESTION_RESPONSE)
                .orElseThrow(() -> new EntityNotFoundException());

        //TODO : AI연동

        return new AIQueryResultDto(false,"AI 답변", dto.answer());
    }

    public NewProblemDto make() {
        Prompt prompt = promptRepository.findByType(PromptType.STORY_GENERATION)
                .orElseThrow(() -> new EntityNotFoundException());

        //TODO : AI 연동

        return new NewProblemDto("title","content","answer");
    }
}
