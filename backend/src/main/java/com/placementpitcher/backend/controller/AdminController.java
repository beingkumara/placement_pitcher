package com.placementpitcher.backend.controller;

import com.placementpitcher.backend.dto.CreateCoreRequest;
import com.placementpitcher.backend.model.Team;
import com.placementpitcher.backend.model.User;
import com.placementpitcher.backend.repository.TeamRepository;
import com.placementpitcher.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${admin.secret}")
    private String adminSecret;

    private final com.placementpitcher.backend.service.EmailSendingService emailSendingService;

    public AdminController(UserRepository userRepository, TeamRepository teamRepository,
            PasswordEncoder passwordEncoder,
            com.placementpitcher.backend.service.EmailSendingService emailSendingService) {
        this.userRepository = userRepository;
        this.teamRepository = teamRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailSendingService = emailSendingService;
    }

    @PostMapping("/create-core")
    public ResponseEntity<?> createCore(@RequestBody CreateCoreRequest request) {
        if (!adminSecret.equals(request.getAdminSecret())) {
            return ResponseEntity.status(403).body("Invalid Admin Secret");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body("Email already exists");
        }

        // Use 'name' from request as Team Name if provided, else use email part
        String teamName = request.getName() != null ? request.getName() : "Team " + request.getEmail();

        // Create Team
        Team team = new Team();
        team.setName(teamName);
        team = teamRepository.save(team);

        // Generate Invite Token
        String token = java.util.UUID.randomUUID().toString();

        // Create Invitation Link
        // Assuming Frontend runs on localhost:5173 for now. In prod, use properties.
        String inviteLink = "http://localhost:5173/setup-account?token=" + token;

        // Create Core User
        User user = new User();
        user.setEmail(request.getEmail());
        // Set a dummy password initially or rely on token flow to set it
        user.setPasswordHash(passwordEncoder.encode(java.util.UUID.randomUUID().toString()));
        user.setName("Core - " + teamName);
        user.setRole(User.Role.CORE);
        user.setTeamId(team.getId());
        user.setInvitationToken(token);
        user.setEnabled(true);

        userRepository.save(user);

        // Send Invitation Email
        try {
            emailSendingService.sendSystemEmail(
                    request.getEmail(),
                    "Placement Pitcher - Core Admin Invitation",
                    String.format("You have been invited to join Placement Pitcher as a Core Admin.\n\n" +
                            "Click the link below to set up your account:\n%s\n\n" +
                            "This link is valid for 24 hours.", inviteLink));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body("User created but failed to send email: " + e.getMessage());
        }

        return ResponseEntity.ok("Core user created and invitation sent successfully");
    }
}
