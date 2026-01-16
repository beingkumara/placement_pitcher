package com.placementpitcher.backend.controller;

import com.placementpitcher.backend.service.ReplyTrackingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ReplyController {

    private final ReplyTrackingService replyTrackingService;

    public ReplyController(ReplyTrackingService replyTrackingService) {
        this.replyTrackingService = replyTrackingService;
    }

    @PostMapping("/check-replies")
    public ResponseEntity<?> checkReplies() {
        try {
            replyTrackingService.checkReplies();
            return ResponseEntity.ok(Collections.singletonMap("message", "Reply check triggered"));
        } catch (Exception e) {
            e.printStackTrace(); // Log the error to the console
            return ResponseEntity.status(500).body(Collections.singletonMap("error", e.getMessage()));
        }
    }
}
