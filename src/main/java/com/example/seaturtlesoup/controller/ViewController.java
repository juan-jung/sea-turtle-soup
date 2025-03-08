package com.example.seaturtlesoup.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class ViewController {

    @GetMapping("/")
    public String root() {
        return "redirect:/problems";
    }

    @GetMapping("/problems")
    public String problems() {
        return "forward:/problems.html";
    }

    @GetMapping("/problem/{problemId}")
    public String problem() {
        return "forward:/problem.html";
    }
}
