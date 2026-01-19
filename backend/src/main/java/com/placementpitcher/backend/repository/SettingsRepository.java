package com.placementpitcher.backend.repository;

import com.placementpitcher.backend.model.Settings;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface SettingsRepository extends MongoRepository<Settings, String> {
}
