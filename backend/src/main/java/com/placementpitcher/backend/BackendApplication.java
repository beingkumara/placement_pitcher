package com.placementpitcher.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@org.springframework.scheduling.annotation.EnableScheduling
@org.springframework.scheduling.annotation.EnableAsync
public class BackendApplication {

	public static void main(String[] args) {
		System.setProperty("java.net.preferIPv4Stack", "true");
		SpringApplication.run(BackendApplication.class, args);
	}

}
