package com.placementpitcher.backend.service;

import com.placementpitcher.backend.model.Contact;
import com.placementpitcher.backend.model.User;
import com.placementpitcher.backend.repository.ContactRepository;
import com.placementpitcher.backend.repository.UserRepository;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ContactService {

    private final ContactRepository contactRepository;
    private final UserRepository userRepository;
    private final com.placementpitcher.backend.service.EmailSendingService emailSendingService;

    public ContactService(ContactRepository contactRepository, UserRepository userRepository,
            com.placementpitcher.backend.service.EmailSendingService emailSendingService) {
        this.contactRepository = contactRepository;
        this.userRepository = userRepository;
        this.emailSendingService = emailSendingService;
    }

    public List<Contact> getContactsForUser(String email) {
        User user = getUser(email);

        if (user.getRole() == User.Role.CORE) {
            // Core sees ALL contacts in their team
            List<Contact> contacts = contactRepository.findByTeamId(user.getTeamId());

            // Populate assignedToName for all contacts
            // Fetch all users in team to map IDs to Names efficiently
            List<User> teamMembers = userRepository.findByTeamId(user.getTeamId());
            java.util.Map<String, String> userNames = teamMembers.stream()
                    .collect(java.util.stream.Collectors.toMap(User::getId, User::getName));

            for (Contact c : contacts) {
                // Lazy Migration: Fix companyName if missing but legacy exists
                if ((c.getCompanyName() == null || c.getCompanyName().isEmpty())
                        && c.getLegacyCompanyName() != null) {
                    c.setCompanyName(c.getLegacyCompanyName());
                    contactRepository.save(c); // Persist the fix
                }

                if (c.getAssignedToId() != null) {
                    c.setAssignedToName(userNames.get(c.getAssignedToId()));
                }
            }
            return contacts;
        } else {
            // Coordinator sees ONLY their assigned contacts
            // Note: Use assignedToId. Implicitly these should be in the same team,
            // but strict filtering by ID is sufficient here.
            List<Contact> contacts = contactRepository.findByAssignedToId(user.getId());

            // For coordinator, they are assigned to themselves
            for (Contact c : contacts) {
                // Lazy Migration: Fix companyName if missing but legacy exists
                if ((c.getCompanyName() == null || c.getCompanyName().isEmpty())
                        && c.getLegacyCompanyName() != null) {
                    c.setCompanyName(c.getLegacyCompanyName());
                    contactRepository.save(c); // Persist the fix
                }

                c.setAssignedToName(user.getName());
            }
            return contacts;
        }
    }

    public Contact createContact(Contact contact, String creatorEmail) {
        User creator = getUser(creatorEmail);

        // Set contextual fields
        contact.setCreatedById(creator.getId());
        contact.setTeamId(creator.getTeamId());

        // Defaults
        if (contact.getStatus() == null) {
            contact.setStatus("Pending");
        }

        // Logic: Coordinator auto-assigns to self
        if (creator.getRole() == User.Role.COORDINATOR) {
            contact.setAssignedToId(creator.getId());
        }
        // If CORE creates it, assignedToId remains null (unassigned) unless explicitly
        // set by frontend.
        // If frontend didn't send it, it's null (Pool).

        // check duplicates? (Later or now)
        if (contactRepository.existsByEmailAndTeamId(contact.getEmail(), contact.getTeamId())) {
            throw new IllegalArgumentException("Contact with this email already exists in your team.");
        }

        return contactRepository.save(contact);
    }

    public Contact updateContact(String id, Contact updatedContact, String userEmail) {
        Contact existing = contactRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Contact not found"));

        // Security Check: Can this user edit this contact?
        User user = getUser(userEmail);
        verifyAccess(existing, user);

        // Update fields allowed to be edited
        // Update fields allowed to be edited - ONLY if provided (Partial Update logic)
        if (updatedContact.getCompanyName() != null) {
            existing.setCompanyName(updatedContact.getCompanyName());
        }
        if (updatedContact.getHrName() != null) {
            existing.setHrName(updatedContact.getHrName());
        }
        if (updatedContact.getEmail() != null) {
            existing.setEmail(updatedContact.getEmail());
        }
        if (updatedContact.getPhone() != null) {
            existing.setPhone(updatedContact.getPhone());
        }
        if (updatedContact.getLinkedIn() != null) {
            existing.setLinkedIn(updatedContact.getLinkedIn());
        }
        if (updatedContact.getContext() != null) {
            existing.setContext(updatedContact.getContext());
        }
        // Status might be updated via a separate transition, but allowing here for CRUD
        if (updatedContact.getStatus() != null) {
            existing.setStatus(updatedContact.getStatus());
        }

        return contactRepository.save(existing);
    }

    public void deleteContact(String id, String userEmail) {
        Contact existing = contactRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Contact not found"));

        User user = getUser(userEmail);
        verifyAccess(existing, user);

        contactRepository.delete(existing);
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    private void verifyAccess(Contact contact, User user) {
        // Core can access anything in team
        if (user.getRole() == User.Role.CORE) {
            if (!contact.getTeamId().equals(user.getTeamId())) {
                throw new SecurityException("Access Denied: Contact belongs to another team");
            }
        } else {
            // Coordinator can only access assigned
            if (!user.getId().equals(contact.getAssignedToId())) {
                throw new SecurityException("Access Denied: You are not assigned to this contact");
            }
        }
    }

    public void assignContacts(String targetUserId, List<String> contactIds, String currentUserEmail) {
        User currentUser = getUser(currentUserEmail);
        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new RuntimeException("Target user not found"));

        // 1. Validate Target User is in Same Team
        if (!targetUser.getTeamId().equals(currentUser.getTeamId())) {
            throw new SecurityException("Access Denied: Cannot assign to user in different team");
        }

        // 2. Fetch Contacts & Validate Ownership
        List<Contact> contacts = contactRepository.findAllById(contactIds);
        for (Contact contact : contacts) {
            if (!contact.getTeamId().equals(currentUser.getTeamId())) {
                throw new SecurityException("Access Denied: Attempting to assign contact from another team");
            }
            contact.setAssignedToId(targetUser.getId());
        }

        // 3. Bulk Save
        // 3. Bulk Save
        contactRepository.saveAll(contacts);

        // 4. Send Email Notification
        try {
            StringBuilder body = new StringBuilder();
            body.append("You have been assigned ").append(contacts.size()).append(" new contacts:\n\n");
            for (Contact c : contacts) {
                body.append("- ").append(c.getCompanyName()).append("\n");
            }
            body.append("\nPlease log in to the dashboard to start pitching.");

            emailSendingService.sendSystemEmail(
                    targetUser.getEmail(),
                    "New Contact Assignments",
                    body.toString());
        } catch (Exception e) {
            e.printStackTrace();
            // Don't fail the assignment if email fails
        }
    }
}
