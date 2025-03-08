package com.example.seaturtlesoup.dto;

import com.example.seaturtlesoup.domain.Problem;
import com.example.seaturtlesoup.domain.type.DifficultyType;
public record ProblemDto(
        Long id,
        String title,
        String content,
        String answer,
        DifficultyType difficulty
) {
    public static ProblemDto of(Long id, String title, String content, String answer, DifficultyType difficulty) {
        return new ProblemDto(id, title, content, answer, difficulty);
    }

    public static ProblemDto from(Problem entity) {
        return ProblemDto.of(
                entity.getId(),
                entity.getTitle(),
                entity.getContent(),
                entity.getAnswer(),
                entity.getDifficulty()
        );
    }
}
