package com.placementpitcher.backend.service;

import com.placementpitcher.backend.model.Contact;
import com.placementpitcher.backend.model.SentEmail;
import com.placementpitcher.backend.model.User;
import com.placementpitcher.backend.repository.ContactRepository;
import com.placementpitcher.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class EmailSendingService {

    private final RestTemplate restTemplate;
    private final ContactRepository contactRepository;
    private final UserRepository userRepository;

    @Value("${resend.api.key}")
    private String resendApiKey;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public EmailSendingService(RestTemplate restTemplate, ContactRepository contactRepository,
            UserRepository userRepository) {
        this.restTemplate = restTemplate;
        this.contactRepository = contactRepository;
        this.userRepository = userRepository;
    }

    public void sendEmail(String contactEmail, String subject, String body, String companyName,
            List<MultipartFile> files, String senderEmail,
            String inReplyToMessageId) {

        if (fromEmail == null || fromEmail.isEmpty()) {
            System.out.println("WARN: Email sending skipped. FROM email is not configured.");
            return;
        }

        User user = userRepository.findByEmail(senderEmail)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        List<Contact> teamContacts = contactRepository.findByTeamId(user.getTeamId());
        Contact contact = teamContacts.stream()
                .filter(c -> c.getEmail() != null && c.getEmail().contains(contactEmail))
                .findFirst()
                .orElseThrow(() -> new com.placementpitcher.backend.exception.ResourceNotFoundException(
                        "Contact not found for email: " + contactEmail));

        // Prepare Resend API Payload
        Map<String, Object> payload = new HashMap<>();
        // Fix: Ensure fromEmail is in format "Name <email>" or just "email". Resend
        // requires verified domain.
        // Assuming fromEmail is something like "onboarding@resend.dev" or verified
        // domain.
        payload.put("from", "Placement Pitcher <" + fromEmail + ">");
        payload.put("to", Collections.singletonList(contactEmail));
        payload.put("subject", subject);
        payload.put("html", body.replace("\n", "<br>"));

        // Threading headers
        Map<String, String> headers = new HashMap<>();
        String generatedMessageId = "<" + UUID.randomUUID().toString() + "@placementpitcher.backend>";
        headers.put("Message-ID", generatedMessageId);

        if (inReplyToMessageId != null && !inReplyToMessageId.isEmpty()) {
            headers.put("In-Reply-To", inReplyToMessageId);
            headers.put("References", inReplyToMessageId);
        }
        payload.put("headers", headers);

        // Attachments
        if (files != null && !files.isEmpty()) {
            List<Map<String, String>> attachments = new ArrayList<>();
            for (MultipartFile file : files) {
                try {
                    Map<String, String> attachment = new HashMap<>();
                    attachment.put("filename", file.getOriginalFilename());
                    attachment.put("content", Base64.getEncoder().encodeToString(file.getBytes()));
                    attachments.add(attachment);
                } catch (Exception e) {
                    System.err.println(
                            "Failed to process attachment: " + file.getOriginalFilename() + " " + e.getMessage());
                }
            }
            if (!attachments.isEmpty()) {
                payload.put("attachments", attachments);
            }
        }

        // Send Request
        sendToResend(payload);

        // Update History
        SentEmail sentEmailLog = new SentEmail();
        sentEmailLog.setSubject(subject);
        sentEmailLog.setBody(body);
        sentEmailLog.setSentAt(LocalDateTime.now());
        sentEmailLog.setMessageId(generatedMessageId);

        if (files != null && !files.isEmpty()) {
            String attachmentNames = files.stream()
                    .map(MultipartFile::getOriginalFilename)
                    .collect(java.util.stream.Collectors.joining(","));
            sentEmailLog.setAttachmentNames(attachmentNames);
        }

        contact.getSentEmails().add(sentEmailLog);
        contact.setStatus("Sent");

        contactRepository.save(contact);
    }

    public void sendSystemEmail(String to, String subject, String body) {
        if (fromEmail == null || fromEmail.isEmpty()) {
            System.out.println("WARN: System email sending skipped. FROM email is not configured.");
            return;
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("from", "Placement Pitcher System <" + fromEmail + ">");
        payload.put("to", Collections.singletonList(to));
        payload.put("subject", subject);
        payload.put("text", body);

        try {
            sendToResend(payload);
        } catch (Exception e) {
            throw new RuntimeException("Failed to send system email: " + e.getMessage(), e);
        }
    }

    private void sendToResend(Map<String, Object> payload) {
        if (resendApiKey == null || resendApiKey.isEmpty() || resendApiKey.startsWith("re_placeholder")) {
            System.out.println("WARN: Resend API Key is missing or invalid. Email not sent.");
            // Throwing exception might be better depending on requirement
            throw new RuntimeException("Resend API Key is not configured correctly.");
        }

        String url = "https://api.resend.com/emails";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(resendApiKey);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);

        try {
            restTemplate.postForEntity(url, entity, String.class);
        } catch (Exception e) {
            // Extract detailed error if possible
            throw new com.placementpitcher.backend.exception.BusinessException(
                    "Failed to send email via Resend: " + e.getMessage(), e);
        }
    }
}
