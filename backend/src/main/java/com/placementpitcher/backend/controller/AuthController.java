package com.placementpitcher.backend.controller;

import com.placementpitcher.backend.model.User;
import com.placementpitcher.backend.repository.UserRepository;
import com.placementpitcher.backend.security.JwtService;
import lombok.Data;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final JwtService jwtService;
    private final UserRepository userRepository;

    public AuthController(AuthenticationManager authenticationManager,
            UserDetailsService userDetailsService,
            JwtService jwtService,
            UserRepository userRepository) {
        this.authenticationManager = authenticationManager;
        this.userDetailsService = userDetailsService;
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @PostMapping(value = "/token", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public ResponseEntity<AuthResponse> login(
            @RequestParam("username") String email, // Frontend sends "username" (OAuth2 style)
            @RequestParam("password") String password) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, password));

        final UserDetails userDetails = userDetailsService.loadUserByUsername(email);
        final User user = userRepository.findByEmail(email).orElseThrow();

        // Add extra claims if needed
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", user.getRole());
        claims.put("name", user.getName());
        claims.put("id", user.getId());

        final String accessToken = jwtService.generateToken(userDetails, claims);

        return ResponseEntity
                .ok(new AuthResponse(accessToken, "bearer", user.getRole().name(), user.getName(), user.getId()));
    }

    @Data
    public static class AuthResponse {
        private final String access_token;
        private final String token_type;
        private final String role;
        private final String name;
        private final String id;
    }
}
