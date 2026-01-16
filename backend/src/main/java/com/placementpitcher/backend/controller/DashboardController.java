package com.placementpitcher.backend.controller;

import com.placementpitcher.backend.dto.StatsResponse;
import com.placementpitcher.backend.model.User;
import com.placementpitcher.backend.repository.ContactRepository;
import com.placementpitcher.backend.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class DashboardController {

    private final ContactRepository contactRepository;
    private final UserRepository userRepository;

    public DashboardController(ContactRepository contactRepository, UserRepository userRepository) {
        this.contactRepository = contactRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/stats")
    public ResponseEntity<StatsResponse> getStats() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        StatsResponse stats = new StatsResponse();

        if (user.getRole() == User.Role.CORE) {
            String teamId = user.getTeamId();
            stats.setTotalContacts(contactRepository.countByTeamId(teamId));
            stats.setPending(contactRepository.countByTeamIdAndStatus(teamId, "Pending"));
            stats.setGenerated(contactRepository.countByTeamIdAndStatus(teamId, "Generated"));
            stats.setSent(contactRepository.countByTeamIdAndStatus(teamId, "Sent"));
            stats.setReplies(contactRepository.countByTeamIdAndStatus(teamId, "Reply Received"));
        } else {
            String userId = user.getId();
            stats.setTotalContacts(contactRepository.countByAssignedToId(userId));
            stats.setPending(contactRepository.countByAssignedToIdAndStatus(userId, "Pending"));
            stats.setGenerated(contactRepository.countByAssignedToIdAndStatus(userId, "Generated"));
            stats.setSent(contactRepository.countByAssignedToIdAndStatus(userId, "Sent"));
            stats.setReplies(contactRepository.countByAssignedToIdAndStatus(userId, "Reply Received"));
        }

        return ResponseEntity.ok(stats);
    }
}
