package com.placementpitcher.backend.repository;

import com.placementpitcher.backend.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmail(String email);

    Optional<User> findByInvitationToken(String invitationToken);

    boolean existsByEmail(String email);

    java.util.List<User> findByTeamId(String teamId);
}
