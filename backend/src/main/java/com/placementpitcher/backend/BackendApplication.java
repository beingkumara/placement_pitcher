package com.placementpitcher.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@org.springframework.scheduling.annotation.EnableScheduling
@org.springframework.scheduling.annotation.EnableAsync
public class BackendApplication {

	public static void main(String[] args) {
		System.out.println("=========================================");
		System.out.println("       EARLY STARTUP ENV DEBUG           ");
		System.out.println("=========================================");
		logEnvVar("MONGO_URI");
		logEnvVar("GEMINI_API_KEY");
		logEnvVar("MAIL_USERNAME");
		logEnvVar("ADMIN_SECRET");
		System.out.println("=========================================");

		SpringApplication.run(BackendApplication.class, args);
	}

	private static void logEnvVar(String name) {
		String value = System.getenv(name);
		String status = (value == null || value.trim().isEmpty()) ? "MISSING" : "PRESENT";
		String details = (value != null && !value.isEmpty()) ? "(Length: " + value.length() + ")" : "";
		System.out.println("ENV DEBUG: " + name + " = " + status + " " + details);
	}

}
