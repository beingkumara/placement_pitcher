package com.placementpitcher.backend.dto;

import lombok.Data;

@Data
public class SendEmailRequest {
    private String contactId;
    private String subject;
    private String body;
}
