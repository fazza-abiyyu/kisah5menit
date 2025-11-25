import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("GEMINI_API_KEY is not set in .env");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

// Pollinations.ai models for text generation (prioritized by reliability)
// Based on API: https://text.pollinations.ai/models
const POLLINATIONS_MODELS = [
    "openai-fast",      // GPT-4.1 Nano (fastest, 5000 chars max)
    "gemini",           // Gemini 2.5 Flash Lite (vision support)
    "mistral",          // Mistral Small 3.2 24B (reliable)
    "deepseek",         // DeepSeek V3.1 (reasoning, 10000 chars max)
    "openai"            // GPT-5 Nano (7000 chars max, fallback)
];

function getRandomModel(): string {
    return POLLINATIONS_MODELS[Math.floor(Math.random() * POLLINATIONS_MODELS.length)];
}

async function tryPollinationsText(prompt: string, maxAttempts: number = 3): Promise<string | null> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        // Rotate models for better chance of success
        const model = getRandomModel();
        try {
            console.log(`Trying Pollinations.ai with model: ${model} (attempt ${attempt}/${maxAttempts})...`);

            // Use POST to avoid 431 "Request Header Fields Too Large" errors
            const url = `https://text.pollinations.ai/`;

            // Add timeout to fetch
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

            const pollinationsResponse = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    model: model,
                    temperature: 0.7,
                    seed: Math.floor(Math.random() * 1000000)
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!pollinationsResponse.ok) {
                console.log(`Pollinations ${model} failed with status ${pollinationsResponse.status}`);
                if (attempt < maxAttempts) await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }

            const text = await pollinationsResponse.text();
            if (!text || text.length < 50) {
                console.log(`Pollinations ${model} returned insufficient text`);
                if (attempt < maxAttempts) await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }

            console.log(`✅ Text generated successfully with Pollinations.ai (${model})`);
            return text;
        } catch (error: any) {
            console.log(`Pollinations ${model} error: ${error.message}`);
            if (attempt < maxAttempts) await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
        }
    }

    console.log(`All Pollinations attempts failed after ${maxAttempts} tries`);
    return null;
}

async function tryGemini(prompt: string): Promise<string | null> {
    console.log("Attempting Gemini API...");
    try {
        const geminiResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        let text: string | undefined;
        if (geminiResponse.text) {
            text = geminiResponse.text;
        } else {
            text = (geminiResponse as any).candidates?.[0]?.content?.parts?.[0]?.text;
        }

        if (!text) {
            console.error("Gemini returned empty response");
            return null;
        }

        console.log("✅ Text generated successfully with Gemini API");
        return text;
    } catch (error: any) {
        console.error(`Gemini API error: ${error.message}`);
        return null;
    }
}

export async function generateText(prompt: string): Promise<string> {
    const MAX_LOOPS = 2; // Loop the whole strategy twice if needed

    for (let loop = 1; loop <= MAX_LOOPS; loop++) {
        if (loop > 1) console.log(`⚠️ Starting generation loop ${loop}/${MAX_LOOPS}...`);

        // Strategy: Pollinations (3x) -> Gemini (2x)

        // 1. Try Pollinations (3 attempts)
        const polyResult = await tryPollinationsText(prompt, 3);
        if (polyResult) return polyResult;

        // 2. Try Gemini (2 attempts)
        if (apiKey) {
            for (let i = 1; i <= 2; i++) {
                const geminiResult = await tryGemini(prompt);
                if (geminiResult) return geminiResult;
                if (i < 2) await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } else {
            console.log("Skipping Gemini (no API key)");
        }

        // If we're looping, wait a bit longer
        if (loop < MAX_LOOPS) await new Promise(resolve => setTimeout(resolve, 3000));
    }

    throw new Error("Text generation failed after exhausting all strategies (Pollinations 3x -> Gemini 2x, looped)");
}
