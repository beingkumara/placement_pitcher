package com.placementpitcher.backend.dto;

import lombok.Data;

@Data
public class CreateCoreRequest {
    private String email;
    private String password; // Optional now
    private String teamName; // Optional
    private String name; // Added to match frontend
    private String adminSecret;
}
