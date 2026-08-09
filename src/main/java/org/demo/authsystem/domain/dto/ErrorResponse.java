package org.demo.authsystem.domain.dto;

public record ErrorResponse(
    int status,
    String message
) {
}
