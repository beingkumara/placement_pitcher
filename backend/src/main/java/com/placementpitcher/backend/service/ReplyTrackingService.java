package com.placementpitcher.backend.service;

import com.placementpitcher.backend.model.Contact;
import com.placementpitcher.backend.model.EmailReply;
import com.placementpitcher.backend.repository.ContactRepository;
import jakarta.mail.*;
import jakarta.mail.search.FlagTerm;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Properties;

@Service
public class ReplyTrackingService {

    private final ContactRepository contactRepository;

    @Value("${spring.mail.imap.host}")
    private String imapHost;

    @Value("${spring.mail.imap.username}")
    private String imapUsername;

    @Value("${spring.mail.imap.password}")
    private String imapPassword;

    public ReplyTrackingService(ContactRepository contactRepository) {
        this.contactRepository = contactRepository;
    }

    @Scheduled(fixedRate = 60000) // Run every minute
    public void checkReplies() {
        if (imapHost == null || imapHost.contains("${")) {
            throw new RuntimeException("IMAP not configured. Please check application.properties.");
        }

        try {
            Properties props = new Properties();
            props.put("mail.store.protocol", "imaps");
            props.put("mail.imaps.host", imapHost);
            props.put("mail.imaps.port", "993");
            props.put("mail.imaps.ssl.enable", "true");
            props.put("mail.imaps.connectiontimeout", "10000"); // 10 seconds
            props.put("mail.imaps.timeout", "10000"); // 10 seconds

            Session session = Session.getDefaultInstance(props);
            Store store = session.getStore("imaps");
            store.connect(imapHost, imapUsername, imapPassword);

            Folder inbox = store.getFolder("INBOX");
            inbox.open(Folder.READ_WRITE);

            // Fetch unseen messages
            Message[] messages = inbox.search(new FlagTerm(new Flags(Flags.Flag.SEEN), false));

            // Sort or just iterate backwards to process recent first
            // JavaMail messages are usually ordered by ID/Date ascending.
            // We want to process newest (last in array) first.

            int limit = 50;
            int processedCount = 0;

            for (int i = messages.length - 1; i >= 0; i--) {
                if (processedCount >= limit) {
                    break;
                }

                Message message = messages[i];
                Address[] fromAddresses = message.getFrom();
                if (fromAddresses == null || fromAddresses.length == 0) {
                    continue;
                }
                String from = ((jakarta.mail.internet.InternetAddress) fromAddresses[0]).getAddress();
                String subject = message.getSubject();

                // Find contact by email BEFORE fetching content
                List<Contact> contacts = contactRepository.findAllByEmailContaining(from);

                if (contacts.isEmpty()) {
                    continue; // Skip this message, leave it as UNSEEN
                }

                // Get Message-ID for threading
                String[] messageIds = message.getHeader("Message-ID");
                String messageId = (messageIds != null && messageIds.length > 0) ? messageIds[0] : null;

                // Now fetch content since we know it's relevant
                String content = getTextFromMessage(message);
                String cleanedContent = cleanEmailContent(content);

                for (Contact contact : contacts) {
                    EmailReply reply = new EmailReply();
                    reply.setSubject(subject);
                    reply.setBody(cleanedContent.length() > 1000 ? cleanedContent.substring(0, 1000) + "..."
                            : cleanedContent);
                    reply.setReceivedAt(LocalDateTime.now());
                    reply.setMessageId(messageId); // Save Message-ID

                    contact.getReplies().add(reply);
                    contact.setStatus("Reply Received");

                    contactRepository.save(contact);
                }

                // Mark as SEEN only if we processed it
                message.setFlag(Flags.Flag.SEEN, true);
                processedCount++;
            }

            inbox.close(false);
            store.close();

        } catch (Exception e) {
            // Handle interruption gracefully (common during shutdown)
            if (isInterruption(e)) {
                System.out.println("Reply checking task interrupted. This is normal during shutdown.");
                // Restore interrupted status if needed, though we are exiting the task anyway
                Thread.currentThread().interrupt();
                return;
            }
            throw new RuntimeException("Error checking email replies: " + e.getMessage(), e);
        }
    }

    private boolean isInterruption(Throwable e) {
        if (e == null)
            return false;
        if (e instanceof InterruptedException)
            return true;
        if (e.getMessage() != null && e.getMessage().contains("Interrupted"))
            return true;
        // Check cause recursively
        return isInterruption(e.getCause());
    }

    private String getTextFromMessage(Message message) throws Exception {
        if (message.isMimeType("text/plain")) {
            return message.getContent().toString();
        } else if (message.isMimeType("multipart/*")) {
            Multipart mimeMultipart = (Multipart) message.getContent();
            return getTextFromMimeMultipart(mimeMultipart);
        }
        return "";
    }

    private String getTextFromMimeMultipart(Multipart mimeMultipart) throws Exception {
        StringBuilder result = new StringBuilder();
        int count = mimeMultipart.getCount();
        for (int i = 0; i < count; i++) {
            BodyPart bodyPart = mimeMultipart.getBodyPart(i);
            if (bodyPart.isMimeType("text/plain")) {
                result.append("\n").append(bodyPart.getContent());
                break; // Prefer plain text
            } else if (bodyPart.isMimeType("text/html")) {
                String html = (String) bodyPart.getContent();
                result.append("\n").append(html); // Or strip HTML tags
            } else if (bodyPart.getContent() instanceof Multipart) {
                result.append(getTextFromMimeMultipart((Multipart) bodyPart.getContent()));
            }
        }
        return result.toString();
    }

    private String cleanEmailContent(String content) {
        if (content == null)
            return "";

        String[] lines = content.split("\\r?\\n");
        StringBuilder cleaned = new StringBuilder();

        for (String line : lines) {
            String trimmed = line.trim();

            // Common reply headers
            if (trimmed.matches("On.*wrote:.*") ||
                    trimmed.matches("On.*sent:.*") ||
                    trimmed.startsWith("-----Original Message-----") ||
                    trimmed.startsWith("From: ")) {
                break;
            }

            // Quoted lines
            if (trimmed.startsWith(">")) {
                break; // Assuming top-posting, stop at first quoted line
            }

            cleaned.append(line).append("\n");
        }

        return cleaned.toString().trim();
    }
}
