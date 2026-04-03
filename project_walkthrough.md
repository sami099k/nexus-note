# Nexus Note Complete Walkthrough

This document details the architecture, the backend functionalities, the database models, and the purpose of each frontend page of the Nexus Note project.

## 1. Project Architecture

The application is structured into two main parts:
* **Backend (`/` root folder):** Powered by Native Node.js with Express.js. It connects to a MongoDB database to handle data and binary file storage (via GridFS). 
* **Frontend (`/frontend` folder):** A Vite-powered frontend handling the user interface and interactions. Although it has React dependencies configured in the package, it leans heavily on a multi-page setup utilizing separate `.html` files for different views. It proxies API requests to the `/api` routes on the backend.

---

## 2. The Frontend Pages

Each `.html` file inside the `frontend` folder represents a distinct view or section of the application platform. Here is what each page does:

1. **`index.html` (Landing Page):**
   * Acts as the entry point/landing page for the unauthenticated user. It usually pitches the platform's value and guides users to log in or sign up.
2. **`signup.html` & `login.html` (Authentication):**
   * Provide the forms for users to register a new account or sign into an existing one. Credentials are exchanged for JWT tokens to authenticate future API requests.
3. **`home.html` (Main Dashboard):**
   * The primary dashboard after a user logs in. This likely displays an aggregated view of subjects, quick links to enrolled subjects, and perhaps recent activity or trending topics.
4. **`profile.html` (User Profile):**
   * An interface for users to manage their account details, view their uploaded resources, see items they've interacted with (like famous questions or reviews), and track their membership across subjects.
5. **`subject.html` (Subject Hub/Community):**
   * Provides a dedicated workspace for a specific subject. Features include notes, famous questions, and discussions. Users can "join" a subject's room to interact with peers studying the same topics.
6. **`create.html` (Resource Creation):**
   * A form-based page to upload new resources, create subject notes, or kick off a new roadmap/discussion. It connects to the `POST /api/resources/upload` endpoint.
7. **`tech-feed.html` (Tech Trends):**
   * A dedicated page displaying the latest news and technology trends fetched from the `api/tech-trends` endpoint. This gives students insight into the market beyond just their curriculum.
8. **`admin-dashboard.html` (Admin Dashboard):**
   * A comprehensive control panel specifically for Admin users. It allows platform administrators to monitor statistics, manage notifications, and easily regulate the application's overall content and user interactions without manual database query intervention.
9. **`about.html` & `contact.html`:**
   * Informational pages explaining what the platform is about, who built it, and support/contact forms.

---

## 3. The Backend Structure

The backend follows a typical MVC (Model-View-Controller) architecture.

### Controllers (`/controllers`)
Handle the core business logic of the application:
* **`authController.js`:** Handles user registration, login, token refresh, and owner setup functions.
* **`userController.js`:** Responsible for retrieving and managing user profiles and assigning user roles (e.g., granting Subject Admin or Owner rights).
* **`subjectController.js`:** Creates and manages subject groupings. 
* **`subjectCommunityController.js`:** Heavyweight logic for interactions inside the subject—such joining a room, retrieving discussions, asking famous questions, and seeing active members.
* **`resourceController.js`:** Manages file uploads directly into MongoDB (using GridFS), and handles the logic for downloading, approving, or flagging resources.
* **`reviewController.js`:** Handles peer reviews on resources (rating and feedback).
* **`techTrendController.js`:** Manages the system for publishing and ingesting the tech trends/news feed.
* **`adminController.js`:** Central hub for elevated operations, supporting features available on the admin dashboard, generating platform-wide stats, and broad control over threads/questions.

### Models (`/models`) (Mongoose Database Schemas)
Define the structure of data stored in your MongoDB database:
* **`User.js`:** Stores user information, credentials, and roles.
* **`Subject.js` & `SubjectMembership.js`:** Stores subjects and maps users to subjects to track who is in what room.
* **`Resource.js` & `Download.js`:** Tracks metadata about uploaded files (notes, documents) and their download statistics.
* **`DiscussionThread.js` & `DiscussionReply.js`:** Structures the forum-like community interactions natively attached to each subject. 
* **`FamousQuestion.js`:** Questions posed inside the subject community. Includes a "verification" status that Admins/Owners can toggle when a question or answer is verified. 
* **`Review.js`:** Allows students to rate and review uploaded resources.
* **`Roadmap.js`:** Outlines curricula or learning pathways relevant to specific subjects.
* **`TechTrend.js`:** Stores latest tech industry news/trends.
* **`Notification.js`:** A robust notification structure utilized to send platform alerts to regular users and admins.

### Routers (`/routers`) & Middleware (`/middleware`)
* **Routers:** Map specific URL patterns (e.g., `GET /api/subjects`) to their corresponding controller functions. 
* **Middleware (`auth.js`, `authorize.js`, `upload.js`):** Middlewares that run before controller functions execute. These check if a user carries a valid JWT token (`auth.js`), if they possess the correct role (like Owner or Admin via `authorize.js`), and intercept `multipart/form-data` logic to process incoming file uploads via `upload.js`. 

### Config & Database (`/config`, `/util`, & `dbConnect.js`)
* Stores environment configurations. 
* Manages the connection loop to MongoDB (`dbConnect.js`).
* Interacts specifically with GridFS buckets (`gridfs.js` in `util`) natively to chunk and deliver file blobs.

---

## The Standard User Flow inside Nexus Note:
1. **Unauthenticated:** A user arrives at `index.html`. They decide to join and register on `signup.html`.
2. **Setup:** The first user acts as the "Owner" and can bootstrap subjects globally. Admins can sign in and direct themselves to the `admin-dashboard.html`.
3. **Engagement:** Users go to `home.html` where they can view available subjects. They select a subject, taking them to `subject.html`. 
4. **Community Action:** Once in the subject hub, the user can "Join" the room (managed by `subjectCommunityController.js`). Now they have access to chat in threads, raise "Famous Questions", or read "Roadmaps".
5. **Uploading/Downloading:** The user might find a resource they need (managed natively via MongoDB streaming). Alternatively, they can upload their own notes on `create.html`.
6. **Exploration:** They can step out of academic content by clicking on the `tech-feed.html` view to see industry trends.
