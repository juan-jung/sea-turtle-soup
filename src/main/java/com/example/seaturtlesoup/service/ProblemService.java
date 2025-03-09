package com.example.seaturtlesoup.service;

import com.example.seaturtlesoup.domain.Problem;
import com.example.seaturtlesoup.domain.type.DifficultyType;
import com.example.seaturtlesoup.dto.AIQueryDto;
import com.example.seaturtlesoup.dto.AIQueryResultDto;
import com.example.seaturtlesoup.dto.NewProblemDto;
import com.example.seaturtlesoup.dto.ProblemDto;
import com.example.seaturtlesoup.repository.ProblemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.persistence.EntityNotFoundException;

@RequiredArgsConstructor
@Transactional
@Service
public class ProblemService {

    private final ProblemRepository problemRepository;
    private final AIService aiService;

    @Transactional(readOnly = true)
    public Page<ProblemDto> getProblems(Pageable pageable) {
        return problemRepository.findAll(pageable).map(ProblemDto::from);
    }

    @Transactional(readOnly = true)
    public ProblemDto getProblem(Long problemId) {
        return problemRepository.findById(problemId).map(ProblemDto::from)
                .orElseThrow(() -> new EntityNotFoundException("해당 문제가 없습니다 - problemId : " + problemId));
    }

    @Transactional(readOnly = true)
    public AIQueryResultDto ask(Long problemId, String question) {
        Problem problem = problemRepository.findById(problemId)
                .orElseThrow(() -> new EntityNotFoundException("해당 문제가 없습니다 - problemId : " + problemId));

        //content, answer, question
        AIQueryDto aiQueryDto = new AIQueryDto(problem.getContent(), problem.getAnswer(),question);
        //isanswer, queryresult, (answer)
        return aiService.query(aiQueryDto);
    }

    public Long makeProblem(DifficultyType difficultyType) {
        NewProblemDto dto = aiService.make(difficultyType);
        Problem problem = problemRepository.save(Problem.of(dto.title(), dto.content(), dto.answer(), difficultyType));
        return problem.getId();
    }
}
