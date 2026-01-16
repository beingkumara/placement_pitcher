package com.placementpitcher.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.web.client.RestClient;

@Configuration
public class AppConfig {

    @Bean
    public RestClient.Builder restClientBuilder() {
        return RestClient.builder();
    }

    @Bean
    @Primary
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        return mapper;
    }

    @Bean
    public org.springframework.boot.autoconfigure.mongo.MongoClientSettingsBuilderCustomizer mongoEnvCustomizer() {
        return settings -> {
            String uri = System.getenv("MONGO_URI");
            if (uri != null && !uri.isEmpty()) {
                settings.applyConnectionString(new com.mongodb.ConnectionString(uri));
            }
        };
    }
}
