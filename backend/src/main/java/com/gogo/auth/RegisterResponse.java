package com.gogo.auth;

public record RegisterResponse(String next) {

    public static RegisterResponse toLogin() {
        return new RegisterResponse("login");
    }
}
