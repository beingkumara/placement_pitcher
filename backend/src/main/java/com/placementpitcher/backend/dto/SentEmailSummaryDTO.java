package com.placementpitcher.backend.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class SentEmailSummaryDTO {
    private String id; // Use UUID or some ID from SentEmail if available, or generate one
    private String subject;
    private LocalDateTime sentAt;
    private String contactCompany;
    private String contactEmail;
}
