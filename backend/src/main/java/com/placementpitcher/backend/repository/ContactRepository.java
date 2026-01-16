package com.placementpitcher.backend.repository;

import com.placementpitcher.backend.model.Contact;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ContactRepository extends MongoRepository<Contact, String> {
    List<Contact> findByTeamId(String teamId);

    List<Contact> findByAssignedToId(String assignedToId);

    boolean existsByEmailAndTeamId(String email, String teamId);

    List<Contact> findAllByEmailContaining(String email);

    // Stats counting
    long countByTeamId(String teamId);

    long countByTeamIdAndStatus(String teamId, String status);

    long countByAssignedToId(String assignedToId);

    long countByAssignedToIdAndStatus(String assignedToId, String status);
}
