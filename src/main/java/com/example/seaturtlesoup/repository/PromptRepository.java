package com.example.seaturtlesoup.repository;

import com.example.seaturtlesoup.domain.Prompt;
import com.example.seaturtlesoup.domain.type.PromptType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PromptRepository extends JpaRepository<Prompt, Long> {
    Optional<Prompt> findByType(PromptType type);
}
