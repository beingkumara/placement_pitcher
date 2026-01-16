package com.placementpitcher.backend.dto;

import lombok.Data;
import java.util.List;

@Data
public class AssignRequest {
    private String userId; // Target user (Coordinator)
    private List<String> contactIds; // List of contact IDs
}
