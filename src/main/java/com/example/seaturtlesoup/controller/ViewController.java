package com.example.seaturtlesoup.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class ViewController {

    @GetMapping("/")
    public String root() {
        return "forward:/problems";
    }

    @GetMapping("/problems")
    public String problems() {
        return "/problems";
    }

    @GetMapping("/problem")
    public String problem() {
        return "/problem";
    }
}
