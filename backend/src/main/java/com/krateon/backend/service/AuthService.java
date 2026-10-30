package com.krateon.backend.service;

import com.krateon.backend.dto.AuthResponse;
import com.krateon.backend.dto.LoginRequest;
import com.krateon.backend.dto.RegisterRequest;
import com.krateon.backend.entity.Role;
import com.krateon.backend.entity.User;
import com.krateon.backend.exception.DuplicateEmailException;
import com.krateon.backend.repository.UserRepository;
import com.krateon.backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateEmailException("An account with email '" + request.getEmail() + "' already exists");
        }

        // Public registration always creates a CUSTOMER; the requested role is ignored so
        // nobody can self-register as ADMIN. Promote admins directly in the database.
        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.CUSTOMER)
                .build();

        User savedUser = userRepository.save(user);

        String token = jwtUtil.generateToken(savedUser.getEmail(), savedUser.getRole());

        return AuthResponse.builder()
                .token(token)
                .email(savedUser.getEmail())
                .role(savedUser.getRole())
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found: " + request.getEmail()));

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole());

        return AuthResponse.builder()
                .token(token)
                .email(user.getEmail())
                .role(user.getRole())
                .build();
    }

}
