package com.gogo.auth;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

class AuthValidationTest {

    @Test
    void normalizesEmail() {
        Assertions.assertEquals("alice@example.com",
                AccountValidation.normalizeEmail("  Alice@Example.COM  "));
        Assertions.assertTrue(AccountValidation.isValidEmail("a@b.co"));
        Assertions.assertFalse(AccountValidation.isValidEmail("a@b"));
        Assertions.assertFalse(AccountValidation.isValidEmail("no-at.example.com"));
        Assertions.assertFalse(AccountValidation.isValidEmail(null));
    }

    @Test
    void countsDisplayNameCodePoints() {
        Assertions.assertEquals("Nina", AccountValidation.normalizeName("  Nina  "));
        Assertions.assertEquals(1, AccountValidation.nameLength("A"));
        Assertions.assertEquals(30, AccountValidation.nameLength("a".repeat(30)));
        Assertions.assertEquals(2, AccountValidation.nameLength("旅行"));
        Assertions.assertEquals(1, AccountValidation.nameLength("\uD83D\uDE00"));
        Assertions.assertEquals(0, AccountValidation.nameLength(AccountValidation.normalizeName("   ")));
    }

    @Test
    void countsPasswordBytes() {
        Assertions.assertEquals(6, AccountValidation.passwordBytes("abcdef"));
        Assertions.assertEquals(72, AccountValidation.passwordBytes("a".repeat(72)));
        Assertions.assertEquals(73, AccountValidation.passwordBytes("a".repeat(73)));
        Assertions.assertEquals(15, AccountValidation.passwordBytes("密码密码密"));
        Assertions.assertEquals(0, AccountValidation.passwordBytes(null));
    }
}
