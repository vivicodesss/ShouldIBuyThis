import 'dotenv/config';
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Serve frontend static files
app.use(express.static(path.join(__dirname)));

const API_KEY = process.env.OPENROUTER_API_KEY;

if (!API_KEY) {
    console.error("❌ Missing OPENROUTER_API_KEY in .env");
}

// ... (keep all your existing helper functions and /analyze route unchanged)

// ✅ Catch-all: send index.html for any unmatched route
app.get("/{*path}", (req, res) => {
    res.sendFile(path.join(__dirname, 'shoppingp', 'index.html'));
});

// ✅ Use Railway's dynamic PORT
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});