package com.placementpitcher.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.Data;

@Data
@Document(collection = "users")
public class User {
    @Id
    private String id;
    @Indexed(unique = true)
    private String email;
    private String passwordHash;
    private String name;
    private Role role;
    private String teamId;
    private String invitationToken; // Added for Step 3
    private boolean enabled = true; // Default to true

    public enum Role {
        CORE, COORDINATOR
    }
}
