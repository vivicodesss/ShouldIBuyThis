import 'dotenv/config';
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.OPENROUTER_API_KEY;

if (!API_KEY) {
    console.error("❌ Missing OPENROUTER_API_KEY in .env");
}

// helper: delay
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

// helper: call model
async function callAI(model, prompt) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost",
            "X-OpenRouter-Title": "Should I Buy This"
        },
        body: JSON.stringify({
            model,
            messages: [
                {
                    role: "system",
                    content: "Return ONLY raw JSON. No markdown. No explanation."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.5
        })
    });

    const data = await res.json();

    if (!res.ok) {
        // log full error so we can debug model failures
        console.log("API error response:", JSON.stringify(data));
        throw new Error(data?.error?.message || "API failed");
    }

    return data?.choices?.[0]?.message?.content;
}

// helper: clean + parse
function safeParse(content) {
    if (!content) throw new Error("Empty response");

    let cleaned = content.trim();
    cleaned = cleaned.replace(/```json/g, "").replace(/```/g, "");

    try {
        return JSON.parse(cleaned);
    } catch {
        return {
            logical_analysis: cleaned,
            emotional_biases: [],
            verdict: "wait",
            verdict_reason: "Model returned unstructured response"
        };
    }
}

// helper: normalize verdict + map fields to what frontend expects
function formatForFrontend(parsed) {
    const verdictMap = {
        "buy": "BUY",
        "wait": "WAIT",
        "dont_buy": "DON'T BUY",
        "don't buy": "DON'T BUY",
        "don't buy": "DON'T BUY",
        "do not buy": "DON'T BUY"
    };

    const normalizedVerdict = verdictMap[parsed.verdict?.toLowerCase()?.trim()] || "WAIT";

    return {
        verdict: normalizedVerdict,
        verdict_reason: parsed.verdict_reason || "No reason provided.",
        bias_flags: parsed.emotional_biases || [],
        cheaper_alternative: parsed.cheaper_alternative || "No cheaper alternative suggested.",
        better_timing: parsed.better_timing || "No better timing suggested.",
        financial_impact: parsed.logical_analysis || "No analysis provided.",
        confidence: parsed.confidence || "medium"
    };
}

// --- ROUTE ---
app.post("/analyze", async (req, res) => {
    const { product, price, income, reason } = req.body;

    if (!product || !price || !income) {
        return res.status(400).json({ error: "Missing fields" });
    }

    const prompt = `
Analyze this purchase decision and return ONLY raw JSON with no markdown, no explanation, no extra text.

Required JSON format:
{
  "logical_analysis": "2-3 sentence analysis of whether this is a smart purchase",
  "emotional_biases": ["bias 1", "bias 2"],
  "cheaper_alternative": "suggest a cheaper or better alternative if any",
  "better_timing": "suggest a better time to buy if applicable",
  "confidence": "low | medium | high",
  "verdict": "buy | wait | dont_buy",
  "verdict_reason": "one clear sentence explaining the verdict"
}

Product: ${product}
Price: $${price}
Monthly Income/Budget: $${income}
Reason for buying: ${reason || "None given"}
`;

    // verified free models on OpenRouter
    const models = [
        "mistralai/mistral-7b-instruct:free",
        "google/gemma-2-9b-it:free",
        "meta-llama/llama-3-8b-instruct:free"
    ];

    for (let model of models) {
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                console.log(`⚡ Trying ${model} (attempt ${attempt})`);

                const content = await callAI(model, prompt);
                console.log("Raw AI response:", content);

                const parsed = safeParse(content);
                const result = formatForFrontend(parsed);

                console.log("✅ SUCCESS FROM:", model);
                console.log("Sending to frontend:", result);

                return res.json(result);

            } catch (err) {
                console.log(`❌ ${model} attempt ${attempt} failed:`, err.message);
                await sleep(1200);
            }
        }
    }

    // final fallback
    console.log("⚠️ ALL MODELS FAILED → using fallback");

    res.json({
        verdict: "WAIT",
        verdict_reason: "AI services are currently busy. Try again later.",
        bias_flags: ["impulse buying"],
        cheaper_alternative: "Consider waiting for a sale.",
        better_timing: "Try again in a few minutes.",
        financial_impact: "Could not analyze at this time.",
        confidence: "low"
    });
});

// --- START ---
app.listen(5000, () => {
    console.log("🚀 Server running on http://localhost:5000");
});