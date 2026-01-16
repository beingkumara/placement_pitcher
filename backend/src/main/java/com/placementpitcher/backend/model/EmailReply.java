package com.placementpitcher.backend.model;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class EmailReply {
    private String subject;
    private String body;
    private LocalDateTime receivedAt;
    private String fromEmail;
    private String messageId;
}
