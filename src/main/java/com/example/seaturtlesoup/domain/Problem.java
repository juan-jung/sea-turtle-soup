package com.example.seaturtlesoup.domain;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import javax.persistence.*;
import java.util.Objects;

@Getter
@ToString
@Entity
public class Problem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Setter @Column(nullable = false) private String title;
    @Setter @Column(nullable = false) private String content;
    @Setter @Column(nullable = false, columnDefinition = "TEXT") private String answer;
    @Setter @Column(nullable = false, columnDefinition = "TEXT") private String difficulty;

    protected Problem() {}

    private Problem(String title, String content, String answer, String difficulty) {
        this.title = title;
        this.content = content;
        this.answer = answer;
        this.difficulty = difficulty;
    }

    public static Problem of(String title, String content, String answer, String difficulty) {
        return new Problem(title,content,answer,difficulty);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Problem problem)) return false;
        return id!=null && Objects.equals(id, problem.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
