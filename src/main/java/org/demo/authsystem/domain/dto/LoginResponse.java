package org.demo.authsystem.domain.dto;

public record LoginResponse(
    String accessToken, String tokenType
) {
    public LoginResponse(String accessToken) {
        this(accessToken, "Bearer");
    }
}
