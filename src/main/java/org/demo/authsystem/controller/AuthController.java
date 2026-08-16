package org.demo.authsystem.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.demo.authsystem.domain.dto.LoginRequest;
import org.demo.authsystem.domain.dto.LoginResponse;
import org.demo.authsystem.domain.dto.RegisterRequest;
import org.demo.authsystem.domain.dto.UserResponse;
import org.demo.authsystem.domain.entity.User;
import org.demo.authsystem.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest request) {
        User user = userService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.toResponse(user));
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(userService.login(request));
    }
}
