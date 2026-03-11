Folder Structure (by Gemini)
LLM-Chatbot/
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
│   │   ├── services/      # AI Logic (Gemini API, Vector Search logic)
│   │   └── index.js       # Entry point
│   ├── .env               # API Keys & Secrets
│   └── package.json
│
└── README.md