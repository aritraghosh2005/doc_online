# 📝 Doc_Online: Real-Time Collaborative Editor

> **A seamless, conflict-free document editing platform built for the modern web.**

![Project Status](https://img.shields.io/badge/Status-Completed-success)
![Tech Stack](https://img.shields.io/badge/Stack-MERN_%2B_Tiptap-blue)
![Real Time](https://img.shields.io/badge/Sync-Real--Time_WebSocket-red)
[![Deployment](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://doconlinefrontend-aarfgfo8k-aritra-ghoshs-projects-dd96853d.vercel.app)

## 🔗 Live Demo
**Try the live application here:** [**Doc_Online (Vercel)**](https://doconlinefrontend-aarfgfo8k-aritra-ghoshs-projects-dd96853d.vercel.app)

---

## 📖 The Problem Statement
In an increasingly remote and digital world, static documents are a bottleneck. Teams struggle with version control, conflicting edits, and the "locked file" phenomenon. Existing solutions are often bloated or proprietary.

**The Challenge:** To build a lightweight, high-performance web application that allows multiple users to edit the same document simultaneously, ensuring:
1.  **Zero Conflicts:** Edits must merge intelligently without overwriting others.
2.  **Low Latency:** Updates must appear instantly across all connected clients.
3.  **Resilience:** The system must handle network interruptions and browser incompatibilities gracefully.

## 🚀 The Solution: Doc_Online
**Doc_Online** tackles this challenge using **Conflict-free Replicated Data Types (CRDTs)** powered by the Y.js ecosystem. It decouples the application logic from the synchronization logic, ensuring a robust and scalable architecture suitable for modern cloud deployments.

## ✨ Key Features
* **Real-Time Synchronization:** Typing on one screen appears instantly on another (millisecond latency).
* **Rich Text Editing:** Powered by **Tiptap**, supporting bold, italics, lists, and headings.
* **Production-Ready Architecture:** Fully optimized for cloud hosting (Vercel & Render) with secure environment variable management.
* **Conflict Resolution:** Handles simultaneous edits automatically using Y.js.
* **Modern Tech Stack:** Built with the latest standards (Node.js, React 18, TypeScript, Vite).

## 🛠️ Tech Stack

### Frontend (Client)
* **Framework:** React (TypeScript)
* **Build Tool:** Vite
* **Editor Engine:** Tiptap (Headless wrapper for Prosemirror)
* **State Management:** Y.js (CRDTs)
* **Connectivity:** @hocuspocus/provider (WebSocket)
* **Deployment:** Vercel

### Backend (Server)
* **Server:** Node.js & Express
* **Sync Engine:** Hocuspocus
* **Database:** MongoDB (for persistent document storage)
* **Authentication:** Clerk / Custom Auth
* **Deployment:** Render

## ⚙️ Installation & Setup (Local Development)

### Prerequisites
* Node.js (v18+)
* MongoDB (Local or Atlas)

### 1. Clone the Repository
```bash
git clone [https://github.com/aritraghosh2005/doc_online.git](https://github.com/aritraghosh2005/doc_online.git)
cd doc_online
```
### 2. Setup the Backend
```bash
cd server
npm install
# Create a .env file and add your MONGO_URL and port configurations
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
npm run dev
```
*The app will launch at http://localhost:5173 (Vite default)*

## 🚧 Roadmap & Future Improvements
* [x] **Phase 1:** Project Setup & Basic UI
* [x] **Phase 2:** Real-time Text Synchronization (Hocuspocus Integration)
* [x] **Phase 3:** Persistent Storage (Save to MongoDB)
* [x] **Phase 4:** Live Presence (User Cursors & Name Tags)
* [x] **Phase 5:** User Authentication (Login/Signup)
* [x] **Phase 6:** Advanced Toolbar & Formatting (Highlighter Palette, Rich Text)
* [x] **Phase 7:** Secure Identity (Integrated Clerk Authentication & User Data)
* [x] **Phase 8:** Production Readiness (Full MongoDB Persistence & Stability)
* [x] **Phase 9:** Dashboard Overhaul (Document Join Logic, UI Polish, Mouse Trails)
* [x] **Final Polish:**
    * Settings Tab & Secure Account Deletion
    * AFK Mode & Interactive Animations
    * Vite Migration & Vercel Deployment Optimization

## 👤 Author
#### Aritra Ghosh
* Undergrad @Vellore Institute of Technology (VIT), Vellore
* B.Tech CSE Core
* Aspiring Software Engineer
---
Built with ❤️ and a lot of debugging & sleepless nights.
