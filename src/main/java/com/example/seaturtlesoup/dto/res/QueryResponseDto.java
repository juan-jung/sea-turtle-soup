package com.example.seaturtlesoup.dto.res;

public record QueryResponseDto(
        Boolean isAnswer,
        String queryResult,
        String answer
) {
}
