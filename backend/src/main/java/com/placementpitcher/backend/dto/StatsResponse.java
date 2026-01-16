package com.placementpitcher.backend.dto;

import lombok.Data;

@Data
public class StatsResponse {
    private long totalContacts;
    private long pending;
    private long generated;
    private long sent;
    private long replies;
}
