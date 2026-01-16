package com.placementpitcher.backend.config;

import com.placementpitcher.backend.model.Team;
import com.placementpitcher.backend.model.User;
import com.placementpitcher.backend.repository.TeamRepository;
import com.placementpitcher.backend.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataSeeder {

    @Bean
    CommandLineRunner initDatabase(UserRepository userRepository, TeamRepository teamRepository,
            PasswordEncoder passwordEncoder) {
        return args -> {
            if (userRepository.count() == 0) {
                // Logger.info("Seeding initial data...");

                // Create Default Team
                Team team = new Team();
                team.setName("Default Core Team");
                team = teamRepository.save(team);

                // Create Admin User
                User admin = new User();
                admin.setEmail("admin@example.com");
                admin.setPasswordHash(passwordEncoder.encode("password")); // Default password
                admin.setName("Admin User");
                admin.setRole(User.Role.CORE);
                admin.setTeamId(team.getId());

                userRepository.save(admin);

                // Logger.info("Seeded Admin User");

            }
        };
    }
}
