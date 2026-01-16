package com.placementpitcher.backend.controller;

import com.placementpitcher.backend.dto.SentEmailSummaryDTO;
import com.placementpitcher.backend.model.Contact;
import com.placementpitcher.backend.model.SentEmail;
import com.placementpitcher.backend.model.User;
import com.placementpitcher.backend.repository.ContactRepository;
import com.placementpitcher.backend.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class SentEmailController {

    private final ContactRepository contactRepository;
    private final UserRepository userRepository;

    public SentEmailController(ContactRepository contactRepository, UserRepository userRepository) {
        this.contactRepository = contactRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/sent-emails")
    public ResponseEntity<List<SentEmailSummaryDTO>> getSentEmails() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Contact> contacts;
        if (user.getRole() == User.Role.CORE) {
            contacts = contactRepository.findByTeamId(user.getTeamId());
        } else {
            contacts = contactRepository.findByAssignedToId(user.getId());
        }

        List<SentEmailSummaryDTO> summaries = new ArrayList<>();
        for (Contact contact : contacts) {
            if (contact.getSentEmails() != null) {
                for (SentEmail sent : contact.getSentEmails()) {
                    SentEmailSummaryDTO dto = new SentEmailSummaryDTO();
                    dto.setId(sent.getMessageId()); // Or random UUID
                    dto.setSubject(sent.getSubject());
                    dto.setSentAt(sent.getSentAt());
                    dto.setContactCompany(contact.getCompanyName());
                    dto.setContactEmail(contact.getEmail());
                    summaries.add(dto);
                }
            }
        }

        // Sort descenting by date
        summaries.sort((a, b) -> b.getSentAt().compareTo(a.getSentAt()));

        return ResponseEntity.ok(summaries);
    }
}
