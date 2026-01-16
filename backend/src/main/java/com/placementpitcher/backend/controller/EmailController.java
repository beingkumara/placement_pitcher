package com.placementpitcher.backend.controller;

import com.placementpitcher.backend.dto.SendEmailRequest;
import com.placementpitcher.backend.service.EmailSendingService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class EmailController {

    private final EmailSendingService emailSendingService;

    public EmailController(EmailSendingService emailSendingService) {
        this.emailSendingService = emailSendingService;
    }

    @PostMapping(value = "/send-email", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> sendEmail(
            @org.springframework.web.bind.annotation.RequestParam("contact_email") String contactEmail,
            @org.springframework.web.bind.annotation.RequestParam("subject") String subject,
            @org.springframework.web.bind.annotation.RequestParam("body") String body,
            @org.springframework.web.bind.annotation.RequestParam("contact_company_name") String contactCompanyName,
            @org.springframework.web.bind.annotation.RequestParam(value = "files", required = false) java.util.List<org.springframework.web.multipart.MultipartFile> files,
            @org.springframework.web.bind.annotation.RequestParam(value = "in_reply_to_message_id", required = false) String inReplyToMessageId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();

        // Find Contact ID based on email/company?
        // Frontend sends contact_email and company_name but NOT ID according to my read
        // of EmailPreview.tsx
        // Wait, EmailPreview.tsx does NOT send contact_id in the formData. It sends
        // contact_email and contact_company_name.
        // But the Service uses request.getContactId().
        // I need to fetch the contact first or update the service to look it up.
        // Let's look at EmailPreview.tsx again.

        // Re-reading EmailPreview.tsx:
        // formData.append('contact_email', contact.email);
        // formData.append('contact_company_name', contact.company_name);
        // It does NOT append contact_id.
        // This means I need to find the contact by email + company (or just email
        // within the user's view).
        // Or better, I should rely on the Service to handle this lookup if I pass the
        // raw params.

        // I will pass these params to the service.
        emailSendingService.sendEmail(contactEmail, subject, body, contactCompanyName, files, email,
                inReplyToMessageId);
        return ResponseEntity.ok("Email sent successfully");
    }
}
