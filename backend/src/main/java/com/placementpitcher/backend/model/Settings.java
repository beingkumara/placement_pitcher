package com.placementpitcher.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "settings")
public class Settings {
    @Id
    private String id;
    private PlacementStats placementStats;
    private String brochureUrl;

    public Settings() {
    }

    public Settings(PlacementStats placementStats, String brochureUrl) {
        this.placementStats = placementStats;
        this.brochureUrl = brochureUrl;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public PlacementStats getPlacementStats() {
        return placementStats;
    }

    public void setPlacementStats(PlacementStats placementStats) {
        this.placementStats = placementStats;
    }

    public String getBrochureUrl() {
        return brochureUrl;
    }

    public void setBrochureUrl(String brochureUrl) {
        this.brochureUrl = brochureUrl;
    }

    public static class PlacementStats {
        private Integer totalStudents;
        private Integer placedInterns;
        private Integer securedPPO;

        public PlacementStats() {
        }

        public PlacementStats(Integer totalStudents, Integer placedInterns, Integer securedPPO) {
            this.totalStudents = totalStudents;
            this.placedInterns = placedInterns;
            this.securedPPO = securedPPO;
        }

        public Integer getTotalStudents() {
            return totalStudents;
        }

        public void setTotalStudents(Integer totalStudents) {
            this.totalStudents = totalStudents;
        }

        public Integer getPlacedInterns() {
            return placedInterns;
        }

        public void setPlacedInterns(Integer placedInterns) {
            this.placedInterns = placedInterns;
        }

        public Integer getSecuredPPO() {
            return securedPPO;
        }

        public void setSecuredPPO(Integer securedPPO) {
            this.securedPPO = securedPPO;
        }

        @Override
        public String toString() {
            return String.format(
                    "Total Students: %d\nStudents with Internships: %d\nStudents with PPOs: %d",
                    totalStudents != null ? totalStudents : 0,
                    placedInterns != null ? placedInterns : 0,
                    securedPPO != null ? securedPPO : 0);
        }
    }
}
