package com.placementpitcher.backend.repository;

import com.placementpitcher.backend.model.Team;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TeamRepository extends MongoRepository<Team, String> {
}
