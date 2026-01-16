package com.placementpitcher.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.placementpitcher.backend.model.Contact;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
public class AiService {

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(AiService.class);

    @Value("${gemini.api.key}")
    private String apiKey;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private static final String GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

    public AiService(RestClient.Builder restClientBuilder, ObjectMapper objectMapper) {
        this.restClient = restClientBuilder.build();
        this.objectMapper = objectMapper;
    }

    public Map<String, String> generateEmail(Contact contact) {
        // Models to try in order
        // Models to try in order
        List<String> models = List.of(
                "gemini-2.0-flash-exp",
                "gemini-2.5-flash",
                "gemini-2.0-flash",
                "gemini-flash-latest",
                "gemini-pro");

        for (String model : models) {
            try {
                return callGemini(model, contact);
            } catch (Exception e) {
                logger.warn("Failed with model {}: {}", model, e.getMessage());
                // Continue to next model
            }
        }
        throw new com.placementpitcher.backend.exception.BusinessException(
                "All AI models failed to generate email. Please check your API key or try again later.");

    }

    private Map<String, String> callGemini(String model, Contact contact) throws Exception {
        String prompt = buildPrompt(contact);
        String url = GEMINI_BASE_URL + "/" + model + ":generateContent?key=" + apiKey;

        // Gemini Request Body
        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(Map.of("text", prompt)))));

        String response = restClient.post()
                .uri(url)
                .body(requestBody)
                .retrieve()
                .body(String.class);

        JsonNode root = objectMapper.readTree(response);
        String text = root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();

        // Expecting JSON from LLM (Prompt engineering handles this)
        // Clean up markdown block if present ```json ... ```
        if (text.contains("```json")) {
            text = text.substring(text.indexOf("```json") + 7);
            if (text.contains("```")) {
                text = text.substring(0, text.indexOf("```"));
            }
        } else if (text.contains("```")) {
            text = text.substring(text.indexOf("```") + 3);
            if (text.contains("```")) {
                text = text.substring(0, text.indexOf("```"));
            }
        }

        return objectMapper.readValue(text, Map.class);
    }

    private String buildPrompt(Contact contact) {
        String history = buildConversationHistory(contact);

        return String.format(
                """
                        You are a professional placement coordinator pitching a candidate or sending a collaboration request to a company.

                        Context about the request: %s
                        Target Company: %s
                        Target HR: %s

                        HISTORY OF CONVERSATION:
                        %s

                        Write an email subject and body.
                        IMPORTANT: If there is a conversation history (i.e., this is a reply), the Subject MUST be "Re: <Original Subject>" to maintain the email thread. Do not invent a new subject for replies.

                        Return ONLY valid JSON in the following format:
                        {
                           "subject": "The email subject line",
                           "body": "The email body text (plain text, keep formatting minimal)"
                        }
                        Do not include any other text.
                        """,
                contact.getContext() != null ? contact.getContext() : "General placement collaboration inquiry",
                contact.getCompanyName(),
                contact.getHrName() != null ? contact.getHrName() : "Hiring Manager",
                history);
    }

    private String buildConversationHistory(Contact contact) {
        if ((contact.getSentEmails() == null || contact.getSentEmails().isEmpty()) &&
                (contact.getReplies() == null || contact.getReplies().isEmpty())) {
            return "No previous conversation.";
        }

        List<MessageItem> messages = new java.util.ArrayList<>();

        if (contact.getSentEmails() != null) {
            for (var email : contact.getSentEmails()) {
                messages.add(new MessageItem("You", email.getBody(), email.getSentAt()));
            }
        }

        if (contact.getReplies() != null) {
            for (var reply : contact.getReplies()) {
                messages.add(new MessageItem("Recipient", reply.getBody(), reply.getReceivedAt()));
            }
        }

        // Sort by timestamp
        messages.sort(java.util.Comparator.comparing(MessageItem::timestamp));

        StringBuilder sb = new StringBuilder();
        for (MessageItem msg : messages) {
            sb.append("[").append(msg.sender()).append("]: ").append(msg.content()).append("\n\n");
        }

        return sb.toString();
    }

    // Internal record for sorting
    private record MessageItem(String sender, String content, java.time.LocalDateTime timestamp) {
    }
}
