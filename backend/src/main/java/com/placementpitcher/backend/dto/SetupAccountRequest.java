package com.placementpitcher.backend.dto;

import lombok.Data;

@Data
public class SetupAccountRequest {
    private String token;
    private String password;
}
