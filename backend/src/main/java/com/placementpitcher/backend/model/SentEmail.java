package com.placementpitcher.backend.model;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class SentEmail {
    private String subject;
    private String body;
    private LocalDateTime sentAt;
    private String messageId;
    private String attachmentNames;
}
