package com.example.seaturtlesoup.dto.res;

import com.example.seaturtlesoup.domain.type.DifficultyType;
import com.example.seaturtlesoup.dto.ProblemDto;

public record ProblemResponseDto(
        Long id,
        String title,
        String content,
        DifficultyType difficulty
) {
    public static ProblemResponseDto of(Long id, String title, String content, DifficultyType difficulty) {
        return new ProblemResponseDto(id, title, content, difficulty);
    }

    public static ProblemResponseDto from(ProblemDto dto) {
        return ProblemResponseDto.of(
                dto.id(),
                dto.title(),
                dto.content(),
                dto.difficulty()
        );
    }
}
