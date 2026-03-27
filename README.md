# DearCode AI

DearCode AI is a premium, multi-character AI chatbot application designed to provide users with engaging and distinct conversational experiences. The platform features uniquely isolated AI personas, including a "Girlfriend," "Best Friend," and "Motivator," each maintaining their own distinct memory, identity persistence, and emotional state tracking.

## Features

- **Multi-Persona AI System**: Chat with different AI characters (Girlfriend, Best Friend, Motivator) with strict memory isolation. Each persona maintains a unique, independent relationship history.
- **Premium Chat Interface**: A modern, mobile-first responsive "ChatGPT-inspired" interface with a refined dark-mode aesthetic, centered conversation threads, slide-out sidebar, and floating input bar.
- **Robust Authentication**: Secure user login and registration flow.
- **Persistent AI Memory**: Backend-side database architecture partitioned by character type to prevent cross-character data leakage and remember past interactions accurately.

## Tech Stack

### Frontend (Client)
- **Framework**: React 19 with Vite
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **Icons**: Lucide React
- **API Communication**: Axios, AI SDK

### Backend (Server)
- **Environment**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: MongoDB (via Mongoose)
- **Security & Utilities**: bcryptjs, helmet, cors, express-rate-limit

## Project Structure

```text
DearCode-Ai/
├── client/                # React (Vite) Frontend
│   ├── src/
│   │   ├── components/    # Reusable UI (ChatInput, MessageBubble)
│   │   ├── features/      # Business logic (chat, auth, docs)
│   │   ├── hooks/         # Custom hooks (e.g., useChatStream)
│   │   ├── services/      # API call definitions (Axios/Fetch)
│   │   ├── store/         # State management (Zustand or Context)
│   │   └── App.jsx
│   └── package.json
│
├── server/                # Node.js + Express Backend
│   ├── src/
│   │   ├── config/        # DB and API configurations
│   │   ├── controllers/   # Request handlers (logic for /chat, /upload)
│   │   ├── middleware/    # Auth, error handling, rate limiting
│   │   ├── models/        # Mongoose schemas (User, Chat, VectorData)
│   │   ├── routes/        # API endpoint definitions
│   │   ├── services/      # AI Logic (LLM integrations, Vector Search)
│   │   └── server.js      # Entry point
│   ├── .env               # API Keys & Secrets
│   └── package.json
│
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd DearCode-Ai
   ```

2. **Setup Server:**
   ```bash
   cd server
   npm install
   # Create a .env file and add your MongoDB URI, API keys, etc.
   npm run dev
   ```

3. **Setup Client:**
   ```bash
   cd ../client
   npm install
   # Create a .env file if necessary (e.g., VITE_API_URL)
   npm run dev
   ```

4. **Access the Application:**
   Open your browser and navigate to `http://localhost:5173` (or the port specified by Vite).