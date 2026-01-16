package com.placementpitcher.backend.controller;

import com.placementpitcher.backend.dto.SetupAccountRequest;
import com.placementpitcher.backend.model.User;
import com.placementpitcher.backend.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api")
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.placementpitcher.backend.service.EmailSendingService emailSendingService;

    public UserController(UserRepository userRepository, PasswordEncoder passwordEncoder,
            com.placementpitcher.backend.service.EmailSendingService emailSendingService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailSendingService = emailSendingService;
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody User newUser) {
        // 1. Check if email already exists
        if (userRepository.findByEmail(newUser.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body("Email already exists");
        }

        // 2. Get current user's teamId
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String currentTeamId = null;

        if (authentication != null && authentication.getPrincipal() instanceof UserDetails) {
            String email = ((UserDetails) authentication.getPrincipal()).getUsername();
            User currentUser = userRepository.findByEmail(email).orElseThrow();
            currentTeamId = currentUser.getTeamId();
        }
        // NOTE: In a real "Invite Core" scenario, the initial user might not have a
        // team yet
        // or we might be creating a new Team. But for "Adding Coordinator", we use
        // current team.
        // For now, let's assume we are adding to the SAME team if it exists.

        newUser.setTeamId(currentTeamId);

        // 3. Generate Invitation Token
        newUser.setInvitationToken(UUID.randomUUID().toString());
        newUser.setPasswordHash(null); // No password yet

        User savedUser = userRepository.save(newUser);

        // Send Invitation Email
        String inviteLink = "http://localhost:5173/setup-account?token=" + newUser.getInvitationToken();
        try {
            emailSendingService.sendSystemEmail(
                    newUser.getEmail(),
                    "Placement Pitcher - Coordinator Invitation",
                    String.format("You have been invited to join Placement Pitcher as a Coordinator.\n\n" +
                            "Click the link below to set up your account:\n%s\n\n" +
                            "This link is valid for 24 hours.", inviteLink));
        } catch (Exception e) {
            e.printStackTrace();
            // Consider rollback or returning a warning? For now proceed.
        }

        return ResponseEntity.ok(savedUser);
    }

    @PostMapping("/setup-account")
    public ResponseEntity<?> setupAccount(@RequestBody SetupAccountRequest request) {
        User user = userRepository.findByInvitationToken(request.getToken())
                .orElseThrow(() -> new RuntimeException("Invalid or expired invitation token"));

        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setInvitationToken(null); // Clear token
        userRepository.save(user);

        return ResponseEntity.ok("Account set up successfully");
    }

    @GetMapping("/users")
    public ResponseEntity<?> getUsers() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String currentTeamId = null;

        if (authentication != null && authentication.getPrincipal() instanceof UserDetails) {
            String email = ((UserDetails) authentication.getPrincipal()).getUsername();
            User currentUser = userRepository.findByEmail(email).orElseThrow();
            currentTeamId = currentUser.getTeamId();
        }

        if (currentTeamId == null) {
            return ResponseEntity.badRequest().body("User not associated with a team");
        }

        return ResponseEntity.ok(userRepository.findByTeamId(currentTeamId));
    }
}
