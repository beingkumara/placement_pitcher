package com.placementpitcher.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.List;
import java.util.ArrayList;
import lombok.Data;

@Data
@Document(collection = "contacts")
public class Contact {
    @Id
    private String id;
    @com.fasterxml.jackson.annotation.JsonIgnore
    private String companyName;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @org.springframework.data.mongodb.core.mapping.Field("company_name")
    private String legacyCompanyName;

    @com.fasterxml.jackson.annotation.JsonProperty("company_name")
    public String getCompanyName() {
        if (companyName != null && !companyName.isEmpty()) {
            return companyName;
        }
        return legacyCompanyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    private String hrName;
    private String email;
    private String phone;
    private String linkedIn;
    private String status; // Pending, Generated, Sent
    private String context;
    private Integer rowIndex;

    private String createdById;
    private String assignedToId;
    private String teamId;

    @org.springframework.data.annotation.Transient
    private String assignedToName;

    private List<SentEmail> sentEmails = new ArrayList<>();
    private List<EmailReply> replies = new ArrayList<>();
}
