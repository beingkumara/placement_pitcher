package com.placementpitcher.backend.controller;

import com.placementpitcher.backend.dto.GenerateEmailRequest;
import com.placementpitcher.backend.model.Contact;
import com.placementpitcher.backend.repository.ContactRepository;
import com.placementpitcher.backend.service.AiService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class AiController {

    private final AiService aiService;
    private final ContactRepository contactRepository;

    public AiController(AiService aiService, ContactRepository contactRepository) {
        this.aiService = aiService;
        this.contactRepository = contactRepository;
    }

    @PostMapping("/generate-email")
    public ResponseEntity<Map<String, String>> generateEmail(@RequestBody GenerateEmailRequest request) {
        Contact contact = contactRepository.findById(request.getContactId())
                .orElseThrow(() -> new RuntimeException("Contact not found"));

        Map<String, String> generatedEmail = aiService.generateEmail(contact);
        return ResponseEntity.ok(generatedEmail);
    }
}
