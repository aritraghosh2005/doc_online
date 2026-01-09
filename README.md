# 📝 Doc_Online: Real-Time Collaborative Editor

> **A seamless, conflict-free document editing platform built for the modern web.**

![Project Status](https://img.shields.io/badge/Status-Active_Development-brightgreen)
![Tech Stack](https://img.shields.io/badge/Stack-MERN_%2B_Tiptap-blue)
![Real Time](https://img.shields.io/badge/Sync-Real--Time_WebSocket-red)

## 📖 The Problem Statement
In an increasingly remote and digital world, static documents are a bottleneck. Teams struggle with version control, conflicting edits, and the "locked file" phenomenon. Existing solutions are often bloated or proprietary.

**The Challenge:** To build a lightweight, high-performance web application that allows multiple users to edit the same document simultaneously, ensuring:
1.  **Zero Conflicts:** Edits must merge intelligently without overwriting others.
2.  **Low Latency:** Updates must appear instantly across all connected clients.
3.  **Resilience:** The system must handle network interruptions and browser incompatibilities gracefully.

## 🚀 The Solution: Doc_Online
**Doc_Online** tackles this challenge using **Conflict-free Replicated Data Types (CRDTs)** powered by the Y.js ecosystem. It decouples the application logic (API) from the synchronization logic (WebSocket), ensuring a robust and scalable architecture.

## ✨ Key Features
* **Real-Time Synchronization:** Typing on one screen appears instantly on another (millisecond latency).
* **Rich Text Editing:** Powered by **Tiptap**, supporting bold, italics, lists, and headings.
* **Dual-Server Architecture:** Separated concerns between the REST API (Express) and the Sync Engine (Hocuspocus).
* **Conflict Resolution:** Handles simultaneous edits automatically using Y.js.
* **Modern Tech Stack:** Built with the latest standards (Node.js v24+, React 18, TypeScript).

## 🛠️ Tech Stack

### Frontend (Client)
* **Framework:** React (TypeScript)
* **Editor Engine:** Tiptap (Headless wrapper for Prosemirror)
* **State Management:** Y.js (CRDTs)
* **Connectivity:** @hocuspocus/provider (WebSocket)

### Backend (Server)
* **API Server:** Node.js & Express (Port 4000)
* **Sync Server:** Hocuspocus Server (Port 1234)
* **Database:** MongoDB (for persistent document storage)

## 🏗️ System Architecture
To solve specific compatibility issues with Node.js v24 and Windows environments, this project uses a **Dual-Port Strategy**:

1.  **Port 4000 (The Brain):** Handles standard HTTP requests, Database connections (MongoDB), and API endpoints.
2.  **Port 1234 (The Nervous System):** A dedicated WebSocket server running `Hocuspocus`. This isolates the heavy traffic of real-time keystrokes from the main application logic.

## ⚙️ Installation & Setup

### Prerequisites
* Node.js (v18 or higher recommended, tested on v24)
* MongoDB (Local or Atlas)

### 1. Clone the Repository
```bash
git clone [https://github.com/YourUsername/doc_online.git](https://github.com/YourUsername/doc_online.git)
cd doc_online
```
### 2. Setup the Backend
```bash
cd server
npm install
# Create a .env file and add your MONGO_URL
```
#### Start the Server:
```bash
# Runs both Express (4000) and Hocuspocus (1234)
npx nodemon index.js
```
### 3. Setup the Frontend
Open a new terminal:
```bash
cd client
npm install --legacy-peer-deps
npm start
```
*The app will launch at http://localhost:3000*

## 🚧 Roadmap & Future Improvements
* [x] **Phase 1:** Project Setup & Basic UI
* [x] **Phase 2:** Real-time Text Synchronization (Hocuspocus Integration)
* [x] **Phase 3:** Persistent Storage (Save to MongoDB)
* [x] **Phase 4:** Live Presence (User Cursors & Name Tags)
* [ ] **Phase 5:** User Authentication (Login/Signup)

## 👤 Author
#### Aritra Ghosh
* Undergrad @Vellore Institute of Technology (VIT), Vellore
* B.Tech CSE Core
* Aspiring Software Engineer
---
Built with ❤️ and a lot of debugging.
