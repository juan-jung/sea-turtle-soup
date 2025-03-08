package com.example.seaturtlesoup.controller;

import com.example.seaturtlesoup.dto.ProblemDto;
import com.example.seaturtlesoup.dto.req.QueryRequestDto;
import com.example.seaturtlesoup.dto.res.QueryResponseDto;
import com.example.seaturtlesoup.dto.res.ProblemResponseDto;
import com.example.seaturtlesoup.service.ProblemService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RequiredArgsConstructor
@RequestMapping("/api")
@RestController
public class ProblemRestController {

    private final ProblemService problemService;

    @GetMapping("/problems")
    public ResponseEntity<Page<ProblemResponseDto>> getProblems(@PageableDefault(size=10) Pageable pageable) {
        Page<ProblemResponseDto> dto = problemService.getProblems(pageable).map(ProblemResponseDto::from);
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/problems/{problemId}")
    public ResponseEntity<ProblemResponseDto> getProblem(@PathVariable Long problemId) {
        ProblemDto dto = problemService.getProblem(problemId);
        return ResponseEntity.ok(ProblemResponseDto.from(dto));
    }

    @PostMapping("/problems/{problemId}/ask")
    public ResponseEntity<QueryResponseDto> ask(@PathVariable Long problemId, @RequestBody QueryRequestDto dto) {
        QueryResponseDto queryResult = new QueryResponseDto(problemService.ask(problemId, dto.question()));
        return ResponseEntity.ok(queryResult);
    }

    @PostMapping("/problems/make")
    public ResponseEntity<Long> make() {
        Long problemId = problemService.makeProblem();
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
}
