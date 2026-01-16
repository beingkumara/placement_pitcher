package com.placementpitcher.backend.controller;

import com.placementpitcher.backend.model.Contact;
import com.placementpitcher.backend.service.ContactService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/contacts")
public class ContactController {

    private final ContactService contactService;

    public ContactController(ContactService contactService) {
        this.contactService = contactService;
    }

    @GetMapping
    public ResponseEntity<List<Contact>> getContacts() {
        String email = getCurrentUserEmail();
        return ResponseEntity.ok(contactService.getContactsForUser(email));
    }

    @PostMapping
    public ResponseEntity<Contact> createContact(@RequestBody Contact contact) {
        String email = getCurrentUserEmail();
        return ResponseEntity.ok(contactService.createContact(contact, email));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Contact> updateContact(@PathVariable String id, @RequestBody Contact contact) {
        String email = getCurrentUserEmail();
        return ResponseEntity.ok(contactService.updateContact(id, contact, email));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteContact(@PathVariable String id) {
        String email = getCurrentUserEmail();
        contactService.deleteContact(id, email);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/assign")
    public ResponseEntity<?> assignContacts(@RequestBody com.placementpitcher.backend.dto.AssignRequest request) {
        String email = getCurrentUserEmail();
        contactService.assignContacts(request.getUserId(), request.getContactIds(), email);
        return ResponseEntity.ok("Contacts assigned successfully");
    }

    private String getCurrentUserEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication.getName(); // Returns the username (email)
    }
}
