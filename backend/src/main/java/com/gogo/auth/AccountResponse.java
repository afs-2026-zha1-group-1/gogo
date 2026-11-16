package com.gogo.auth;

public record AccountResponse(long id, String name, String email) {

    public static AccountResponse from(AccountPrincipal principal) {
        return new AccountResponse(principal.id(), principal.name(), principal.email());
    }
}
