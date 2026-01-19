# Placement Pitcher

Placement Pitcher is a comprehensive tool designed to streamline the placement process for teams. It facilitates contact management, team coordination, and AI-powered personalized email pitching to potential recruiters or companies.

## Technology Stack

### Backend
- **Framework**: Spring Boot (Java)
- **Database**: MongoDB
- **Security**: Spring Security with JWT Authentication
- **Build Tool**: Maven

### Frontend
- **Framework**: React.js (via Vite)
- **Styling**: Tailwind CSS
- **Language**: TypeScript/JavaScript

## User Roles

The application supports two primary roles, each with specific permissions:

### 1. CORE (Team Admin)
The **CORE** user acts as the administrator for a team.
- **Responsibilities**:
    - Configuring the team workspace.
    - specialized access to administrative settings (implied by role presence).
    - Inviting COORDINATORs to join the team.
- **Creation**: A CORE user is created via the `/api/admin/create-core` endpoint, usually requiring a system-level admin secret. Upon creation, a dedicated "Team" is established.

### 2. COORDINATOR (Team Member)
**COORDINATOR**s are team members responsible for execution.
- **Responsibilities**:
    - Managing contacts (Add, Update, Delete).
    - Importing contacts in bulk via Excel.
    - Sending pitches and managing email communications.
- **Onboarding**: Coordinators are invited by the CORE user via email links.

## Key Features

### 1. Team Management & Onboarding
- **Core Setup**: Secure endpoint to initialize a new Team and its CORE admin.
- **Invitation System**: System generates unique invitation tokens sent via email to new members, allowing them to securely set up their accounts and join the correct team.

### 2. Contact Management
- **Centralized Database**: Store and manage contact details for companies/recruiters.
- **CRUD Operations**: Create, Read, Update, and Delete contacts.
- **Excel Import**: Bulk upload contacts using Excel files for efficiency.
- **Assignment**: Contacts can be assigned to specific users for personalized follow-ups.

### 3. AI-Powered Pitching
- **Generative AI Integration**: The application utilizes AI services to generate personalized email pitches.
- **Contextual Generation**: Generates emails based on contact details, ensuring relevant and engaging content.

### 4. Email System
- **Sent Email Tracking**: Tracks emails sent through the system to avoid duplicates and monitor outreach.
- **Reply Management**: Handles incoming replies (infrastructure in place for handling email threads).

### 5. Security
- **JWT Authentication**: Secure stateless authentication mechanism.
- **Role-Based Access Control (RBAC)**: Ensures users can only access features permitted by their role.

### 6. Settings Management
- **Placement Stats**: Manage and display real-time placement statistics (Total Students, Placed Interns, PPOs).
- **Brochure Management**: Update and host the link to the official placement brochure.

## Getting Started

### Prerequisites
- Java 17+
- Node.js & npm
- MongoDB instance (Local or Atlas)

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
> [!IMPORTANT]
> The application **will not run** without the necessary environment variables set in `src/main/resources/application.properties`. You must configure these before starting the application.

2. Configure environment variables (or directly edit `application.properties`) with your keys:
   - `GEMINI_API_KEY`: For AI pitch generation.
   - `MAIL_USERNAME` & `MAIL_PASSWORD`: For sending emails (SMTP).
   - `IMAP_USERNAME` & `IMAP_PASSWORD`: For reading replies (IMAP).
   - `ADMIN_SECRET`: For secured admin endpoints.
3. Run the application:
   ```bash
   ./mvnw spring-boot:run
   ```
   The backend runs on port `8080`.

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend typically runs on port `5173`.
