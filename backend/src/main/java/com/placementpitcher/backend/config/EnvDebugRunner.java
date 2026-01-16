package com.placementpitcher.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class EnvDebugRunner implements CommandLineRunner {

    @Value("${MONGO_URI:}")
    private String mongoUri;

    @Value("${GEMINI_API_KEY:}")
    private String geminiApiKey;

    @Value("${MAIL_USERNAME:}")
    private String mailUsername;

    @Value("${ADMIN_SECRET:}")
    private String adminSecret;

    @Override
    public void run(String... args) throws Exception {
        System.out.println("=========================================");
        System.out.println("       ENVIRONMENT VARIABLE DEBUG        ");
        System.out.println("=========================================");

        logEnvVar("MONGO_URI", mongoUri);
        logEnvVar("GEMINI_API_KEY", geminiApiKey);
        logEnvVar("MAIL_USERNAME", mailUsername);
        logEnvVar("ADMIN_SECRET", adminSecret);

        System.out.println("=========================================");
    }

    private void logEnvVar(String name, String value) {
        String status = (value == null || value.trim().isEmpty()) ? "MISSING" : "PRESENT";
        // If present, optionally show length or hash for sanity check, but NOT the
        // value
        String details = (value != null && !value.isEmpty()) ? "(Length: " + value.length() + ")" : "";
        System.out.println("ENV DEBUG: " + name + " = " + status + " " + details);
    }
}
