package com.example.seaturtlesoup.repository;

import com.example.seaturtlesoup.domain.Problem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProblemRepository extends JpaRepository<Problem, Long> {
}
