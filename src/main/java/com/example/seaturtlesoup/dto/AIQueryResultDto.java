package com.example.seaturtlesoup.dto;

public record AIQueryResultDto(
        Boolean isAnswer,
        String queryResult,
        String answer
) {
}
