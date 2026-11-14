package com.gogo.hello;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = "com.gogo")
public class HelloApplication {

    public static void main(String[] args) throws IOException {
        // The SQLite driver creates the database file but not its parent directory.
        Files.createDirectories(Path.of("data"));
        SpringApplication.run(HelloApplication.class, args);
    }
}
