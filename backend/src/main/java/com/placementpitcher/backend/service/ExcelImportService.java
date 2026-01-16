package com.placementpitcher.backend.service;

import com.placementpitcher.backend.model.Contact;
import com.placementpitcher.backend.model.User;
import com.placementpitcher.backend.repository.ContactRepository;
import com.placementpitcher.backend.repository.UserRepository;
import org.apache.poi.ss.usermodel.*;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ExcelImportService {

    private final ContactRepository contactRepository;
    private final UserRepository userRepository;

    public ExcelImportService(ContactRepository contactRepository, UserRepository userRepository) {
        this.contactRepository = contactRepository;
        this.userRepository = userRepository;
    }

    public Map<String, Integer> importContacts(MultipartFile file, String email) throws IOException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        List<Contact> contactsToSave = new ArrayList<>();
        int skipped = 0;

        try (InputStream is = file.getInputStream(); Workbook workbook = WorkbookFactory.create(is)) {
            Sheet sheet = workbook.getSheetAt(0);

            // Expect headers in Row 0
            Row headerRow = sheet.getRow(0);
            Map<String, Integer> colMap = new HashMap<>();

            if (headerRow != null) {
                for (Cell cell : headerRow) {
                    // Normalize: lowercase, trim, replace spaces with underscores
                    String header = getCellValue(cell).toLowerCase().trim().replace(" ", "_");
                    colMap.put(header, cell.getColumnIndex());
                }
            }

            for (Row row : sheet) {
                if (row.getRowNum() == 0)
                    continue; // Skip header

                String companyName = getString(row, colMap, "company_name");
                String emailAddr = getString(row, colMap, "email");

                // Minimal validation: Needs Company Name + Email (or at least Company Name?)
                // Let's say Company Name is mandatory.
                if (companyName == null || companyName.isEmpty())
                    continue;

                if (emailAddr != null && !emailAddr.isEmpty()) {
                    // Duplicate Check
                    if (contactRepository.existsByEmailAndTeamId(emailAddr, user.getTeamId())) {
                        skipped++;
                        continue;
                    }
                }

                Contact contact = new Contact();
                contact.setCompanyName(companyName);
                contact.setEmail(emailAddr);
                contact.setHrName(getString(row, colMap, "hr_name"));
                contact.setPhone(getString(row, colMap, "phone"));
                contact.setLinkedIn(getString(row, colMap, "linkedin"));
                contact.setContext(getString(row, colMap, "context"));

                contact.setStatus("Pending");
                contact.setTeamId(user.getTeamId());
                contact.setCreatedById(user.getId());

                // If coordinator, assign to self
                if (user.getRole() == User.Role.COORDINATOR) {
                    contact.setAssignedToId(user.getId());
                }

                contactsToSave.add(contact);
            }
        }

        contactRepository.saveAll(contactsToSave);

        Map<String, Integer> result = new HashMap<>();
        result.put("saved", contactsToSave.size());
        result.put("skipped", skipped);
        return result;
    }

    private String getString(Row row, Map<String, Integer> colMap, String colName) {
        if (!colMap.containsKey(colName))
            return null;
        int idx = colMap.get(colName);
        Cell cell = row.getCell(idx, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null)
            return null;
        return getCellValue(cell);
    }

    private String getCellValue(Cell cell) {
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue();
            case NUMERIC:
                return String.valueOf((long) cell.getNumericCellValue()); // Handle phone numbers as string
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            default:
                return "";
        }
    }
}
