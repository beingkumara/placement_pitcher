package com.placementpitcher.backend.controller;

import com.placementpitcher.backend.model.Settings;
import com.placementpitcher.backend.repository.SettingsRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final SettingsRepository settingsRepository;

    public SettingsController(SettingsRepository settingsRepository) {
        this.settingsRepository = settingsRepository;
    }

    @GetMapping
    public ResponseEntity<Settings> getSettings() {
        List<Settings> allSettings = settingsRepository.findAll();
        if (allSettings.isEmpty()) {
            return ResponseEntity.ok(new Settings(new Settings.PlacementStats(0, 0, 0), ""));
        }
        return ResponseEntity.ok(allSettings.get(0));
    }

    @PostMapping
    public ResponseEntity<Settings> saveSettings(@RequestBody Settings settings) {
        List<Settings> allSettings = settingsRepository.findAll();
        if (allSettings.isEmpty()) {
            return ResponseEntity.ok(settingsRepository.save(settings));
        }

        Settings existing = allSettings.get(0);
        // The original code directly overwrites.
        // The instruction seems to imply a more nuanced update,
        // but the provided snippet is incomplete and syntactically incorrect.
        // Assuming the intent was to update existing fields if they are provided in the
        // new settings.
        // If settings.getPlacementStats() is null, it means it's not being updated, so
        // keep existing.
        if (settings.getPlacementStats() != null) {
            existing.setPlacementStats(settings.getPlacementStats());
        }
        if (settings.getBrochureUrl() != null) {
            existing.setBrochureUrl(settings.getBrochureUrl());
        }

        return ResponseEntity.ok(settingsRepository.save(existing));
    }
}
