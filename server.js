import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { OpenAI } from "openai";
import fs from "fs";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

dotenv.config();
const app = express();
app.set("trust proxy", true);
app.use(cors());
app.use(express.json());

if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY in environment");
  process.exit(1);
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ipLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.set("Retry-After", String(60 * 60)); // seconds
    res
      .status(429)
      .json({ error: "Too many requests from this IP, try later" });
  },
});

app.use(ipLimiter);

const sessionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // When no sessionId provided, fall back to IP (more strict)
    const sid =
      req.body && typeof req.body.sessionId === "string"
        ? req.body.sessionId
        : null;
    if (sid) return sid;
    return ipKeyGenerator(req);
  },
  handler: (req, res) => {
    // express-rate-limit does not set Retry-After automatically; set it here.
    res.set("Retry-After", String(60)); // seconds
    res.status(429).json({
      error: "Too many requests for this session or IP, try later",
    });
  },
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

function validateAndApplyLimiter(handler) {
  return async (req, res, next) => {
    const { message, sessionId } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    if (!sessionId || typeof sessionId !== "string") {
      return res.status(400).json({ error: "sessionId is required" });
    }

    // Now call sessionLimiter middleware. If it allows, control flows to our handler.
    sessionLimiter(req, res, async (err) => {
      if (err) return next(err); // pass unexpected errors to express error handler
      try {
        await handler(req, res, next);
      } catch (e) {
        next(e);
      }
    });
  };
}

app.post(
  "/api/hitesh-chat",
  validateAndApplyLimiter(async (req, res) => {
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
  })
);

app.post(
  "/api/piyush-chat",
  validateAndApplyLimiter(async (req, res) => {
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
  })
);

app.get(
  "/api/health",
  validateAndApplyLimiter((req, res) => {
    try {
      res.status(200).json({ reply: "Server is running" });
    } catch (error) {
      console.error("health error:", error);
      res.status(500).json({ error: "Something went wrong" });
    }
  })
);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
