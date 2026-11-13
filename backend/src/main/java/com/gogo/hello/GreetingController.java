package com.gogo.hello;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class GreetingController {

    private final GreetingRepository greetingRepository;

    public GreetingController(GreetingRepository greetingRepository) {
        this.greetingRepository = greetingRepository;
    }

    @GetMapping(path = "/api/greeting", produces = MediaType.TEXT_PLAIN_VALUE)
    public String greeting() {
        return greetingRepository.findMessage();
    }
}
