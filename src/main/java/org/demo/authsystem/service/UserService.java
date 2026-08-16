package org.demo.authsystem.service;

import lombok.RequiredArgsConstructor;
import org.demo.authsystem.domain.dto.LoginRequest;
import org.demo.authsystem.domain.dto.LoginResponse;
import org.demo.authsystem.domain.dto.RegisterRequest;
import org.demo.authsystem.domain.dto.UserResponse;
import org.demo.authsystem.domain.entity.ERole;
import org.demo.authsystem.domain.entity.Role;
import org.demo.authsystem.domain.entity.User;
import org.demo.authsystem.exception.EmailAlreadyExistsException;
import org.demo.authsystem.repository.RoleRepository;
import org.demo.authsystem.repository.UserRepository;
import org.demo.authsystem.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    @Transactional
    public User register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new EmailAlreadyExistsException(request.email());
        }

        Role userRole = roleRepository.findByName(ERole.ROLE_USER)
            .orElseThrow(() -> new IllegalStateException("ROLE_USER not seeded"));

        User user = User.builder()
            .email(request.email())
            .password(passwordEncoder.encode(request.password()))
            .roles(Set.of(userRole))
            .build();

        return userRepository.save(user);

    }
    public LoginResponse login(LoginRequest request) {

        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                request.email(),
                request.password()
            )
        );

        UserDetails userDetails = (UserDetails) authentication.getPrincipal();

        String token = jwtService.generateToken(userDetails);

        return new LoginResponse(token);
    }

    public UserResponse toResponse(User user) {
        Set<String> roleNames = user.getRoles().stream()
            .map(role -> role.getName().name())
            .collect(Collectors.toSet());
        return new UserResponse(user.getId(), user.getEmail(), roleNames);
    }

}
