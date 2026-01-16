package com.placementpitcher.backend.controller;

import com.placementpitcher.backend.service.ExcelImportService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ImportController {

    private final ExcelImportService excelImportService;

    public ImportController(ExcelImportService excelImportService) {
        this.excelImportService = excelImportService;
    }

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Integer>> uploadFile(@RequestParam("file") MultipartFile file) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String email = auth.getName();

            Map<String, Integer> stats = excelImportService.importContacts(file, email);
            return ResponseEntity.ok(stats);
        } catch (IOException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
