# AI Persona Chat - Backend

An **Express.js** backend service designed to power an AI Persona Chat application.  
This backend provides APIs for generating AI-driven persona responses using pre-defined system prompts (e.g., _Hitesh Sir_ and _Piyush Sir_ personas) and integrates with AI models to simulate styled, personality-based conversations.

## 💻 Live Link

Try it out : https://persona-ai-frontend-alpha.vercel.app/

## 🚀 Features

- **Multiple AI Personas**  
  Load and serve pre-defined system prompts for different AI personalities.

- **REST API for Chat Completion**  
  Handle chat requests and return persona-specific responses.

- **Easy Configuration**  
  Persona prompts stored as `.txt` files for simple modifications.

- **Lightweight & Fast**  
  Uses minimal dependencies for quick startup and performance.

---

## 🧱 Project Structure

```bash

AI-Persona-Chat-Backend/
├── hitesh-system-prompt.txt
├── piyush-system-prompt.txt
├── server.js
├── .env
└── README.md # You're here
```

## ⚙️ Installation

### 1. Backend Setup

```bash
cd AI-Persona-Chat-Backend
npm i

# Create a .env file
touch .env
# Add your OpenAI/Gemini API keys and secret settings

# Start the backend
node server.js
```

## 🔐 API Overview

### Health

- GET /api/health — Sign up

### Chat

- POST /api/hitesh-chat — Send a message (requires message and sessionID)
- POST /api/piyush-chat — Send a message (requires message and sessionID)

## 🔧 Environment Variables

Your .env file in the AI-Persona-Chat-Backend/ directory should include:

```bash
OPENAI_API_KEY = your-openai-key
```

## 🧠 Credits

Built by Sarvesh Kulkarni as an assignment project as part of ChaiCode GenAI with JS Cohort.

## 📄 License

MIT License
