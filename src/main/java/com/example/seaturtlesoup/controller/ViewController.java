package com.example.seaturtlesoup.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

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

    @GetMapping("/problems/{problemId}")
    public String problem(@PathVariable Long problemId, Model model) {
        model.addAttribute("problemId",problemId);
        return "forward:/problem.html";
    }
}
