package com.placementpitcher.backend.service;

import com.placementpitcher.backend.dto.SendEmailRequest;
import com.placementpitcher.backend.model.Contact;
import com.placementpitcher.backend.model.SentEmail;
import com.placementpitcher.backend.model.User;
import com.placementpitcher.backend.repository.ContactRepository;
import com.placementpitcher.backend.repository.UserRepository;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class EmailSendingService {

    private final JavaMailSender mailSender;
    private final ContactRepository contactRepository;
    private final UserRepository userRepository;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public EmailSendingService(JavaMailSender mailSender, ContactRepository contactRepository,
            UserRepository userRepository) {
        this.mailSender = mailSender;
        this.contactRepository = contactRepository;
        this.userRepository = userRepository;
    }

    public void sendEmail(String contactEmail, String subject, String body, String companyName,
            java.util.List<org.springframework.web.multipart.MultipartFile> files, String senderEmail,
            String inReplyToMessageId) {
        User user = userRepository.findByEmail(senderEmail)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        // Lookup contact by email and team (since email is unique per team)
        java.util.List<Contact> teamContacts = contactRepository.findByTeamId(user.getTeamId());
        Contact contact = teamContacts.stream()
                .filter(c -> c.getEmail() != null && c.getEmail().contains(contactEmail)) // specific match
                .findFirst()
                .orElseThrow(() -> new com.placementpitcher.backend.exception.ResourceNotFoundException(
                        "Contact not found for email: " + contactEmail));

        String targetEmail = contactEmail; // Already validated by frontend mostly, but good to have

        // Generate and set consistent Message-ID
        String generatedMessageId = "<" + UUID.randomUUID().toString() + "@placementpitcher.backend>";

        // Send Email
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);

            helper.setFrom(fromEmail);
            helper.setTo(targetEmail);
            helper.setSubject(subject);

            // Set consistent Message-ID
            message.setHeader("Message-ID", generatedMessageId);

            // Set threading headers if this is a reply
            if (inReplyToMessageId != null && !inReplyToMessageId.isEmpty()) {
                message.setHeader("In-Reply-To", inReplyToMessageId);
                message.setHeader("References", inReplyToMessageId);
            }

            // Convert newlines to breaks since we are sending as HTML
            String htmlBody = body.replace("\n", "<br>");
            helper.setText(htmlBody, true);

            if (files != null && !files.isEmpty()) {
                for (org.springframework.web.multipart.MultipartFile file : files) {
                    helper.addAttachment(file.getOriginalFilename(), file);
                }
            }

            mailSender.send(message);

        } catch (MessagingException e) {
            throw new com.placementpitcher.backend.exception.BusinessException(
                    "Failed to send email: " + e.getMessage(), e);
        }

        // Update History
        SentEmail sentEmailLog = new SentEmail();
        sentEmailLog.setSubject(subject);
        sentEmailLog.setBody(body);
        sentEmailLog.setSentAt(LocalDateTime.now());
        sentEmailLog.setMessageId(generatedMessageId); // Use the generated Message-ID

        // Log attachments if any
        if (files != null && !files.isEmpty()) {
            String attachmentNames = files.stream()
                    .map(org.springframework.web.multipart.MultipartFile::getOriginalFilename)
                    .collect(java.util.stream.Collectors.joining(","));
            sentEmailLog.setAttachmentNames(attachmentNames);
        }

        contact.getSentEmails().add(sentEmailLog);
        contact.setStatus("Sent");

        contactRepository.save(contact);
    }

    public void sendSystemEmail(String to, String subject, String body) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);

            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body, false); // Plain text for system emails usually

            mailSender.send(message);

        } catch (MessagingException e) {
            throw new RuntimeException("Failed to send system email", e);
        }
    }
}
