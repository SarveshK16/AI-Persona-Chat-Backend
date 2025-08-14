import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { OpenAI } from "openai";
import fs from "fs";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY in environment");
  process.exit(1);
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const HITESH_PROMPT = fs.readFileSync("./hitesh-system-prompt.txt", "utf8");
const PIYUSH_PROMPT = fs.readFileSync("./piyush-system-prompt.txt", "utf8");

const sessionHistories = new Map();

const MAX_HISTORY_MESSAGES = 10;

function ensureHistory(sessionId) {
  if (!sessionHistories.has(sessionId)) {
    sessionHistories.set(sessionId, []);
  }
  return sessionHistories.get(sessionId);
}

function pushMessage(sessionId, message) {
  const history = ensureHistory(sessionId);
  history.push(message);
  while (history.length > MAX_HISTORY_MESSAGES) {
    history.shift();
  }
}

function buildMessages(systemPrompt, sessionId, userMessage) {
  const history = ensureHistory(sessionId);
  const messages = [{ role: "system", content: systemPrompt }, ...history];
  messages.push({ role: "user", content: userMessage });
  return messages;
}

app.post("/api/hitesh-chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    if (!sessionId || typeof sessionId !== "string") {
      return res.status(400).json({ error: "sessionId is required" });
    }

    const messages = buildMessages(HITESH_PROMPT, sessionId, message);

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
    });

    const aiReply = response.choices?.[0]?.message?.content ?? "";

    pushMessage(sessionId, { role: "user", content: message });
    pushMessage(sessionId, { role: "assistant", content: aiReply });

    res.status(200).json({ reply: aiReply });
  } catch (error) {
    console.error("hitesh-chat error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.post("/api/piyush-chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    if (!sessionId || typeof sessionId !== "string") {
      return res.status(400).json({ error: "sessionId is required" });
    }

    const messages = buildMessages(PIYUSH_PROMPT, sessionId, message);

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
    });

    const aiReply = response.choices?.[0]?.message?.content ?? "";

    pushMessage(sessionId, { role: "user", content: message });
    pushMessage(sessionId, { role: "assistant", content: aiReply });

    res.status(200).json({ reply: aiReply });
  } catch (err) {
    console.error("piyush-chat error:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
