package org.demo.authsystem.controller;

import lombok.RequiredArgsConstructor;
import org.demo.authsystem.domain.dto.UserResponse;
import org.demo.authsystem.security.CustomUserDetails;
import org.demo.authsystem.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(@AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(userService.toResponse(principal.getUser()));
    }
}
