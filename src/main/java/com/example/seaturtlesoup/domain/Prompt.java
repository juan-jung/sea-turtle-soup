package com.example.seaturtlesoup.domain;

import com.example.seaturtlesoup.domain.type.PromptType;
import lombok.Getter;

import javax.persistence.*;

@Getter
@Entity
public class Prompt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private PromptType type;

    @Column(columnDefinition = "TEXT") private String content;
}
