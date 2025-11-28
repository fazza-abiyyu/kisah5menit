import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import {
    isModelBlacklisted,
    recordModelFailure,
    recordModelSuccess,
    getHealthyModels
} from "./model-health.js";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("GEMINI_API_KEY is not set in .env");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

// Pollinations.ai models for text generation (prioritized by reliability)
// Based on API: https://text.pollinations.ai/models
// Updated: 2025-11-25 - All non-community text models
const POLLINATIONS_MODELS = [
    "openai-fast",          // GPT-4.1 Nano (fastest, 5000 chars max, tier: anonymous)
    "gemini",               // Gemini 2.5 Flash Lite (vision support, tier: seed)
    "mistral",              // Mistral Small 3.2 24B (reliable, tier: seed)
    "deepseek",             // DeepSeek V3.1 (reasoning, 10000 chars max, tier: seed)
    "openai",               // GPT-5 Nano (7000 chars max, tier: anonymous)
    "openai-reasoning",     // o4 Mini (reasoning, tier: seed)
    "gemini-search",        // Gemini 2.5 Flash Lite with Google Search (tier: seed)
    "qwen-coder",           // Qwen 2.5 Coder 32B (good for structured output, tier: flower)
    "roblox-rp"             // Llama 3.1 8B Instruct (tier: seed)
];

function getRandomModel(availableModels: string[] = POLLINATIONS_MODELS): string {
    // Filter out blacklisted models
    const healthyModels = getHealthyModels(availableModels);

    if (healthyModels.length === 0) {
        console.warn("⚠️  All provided Pollinations models are blacklisted, using first available as fallback");
        return availableModels[0]; // Fallback to first model
    }

    const selected = healthyModels[Math.floor(Math.random() * healthyModels.length)];
    console.log(`🎲 Selected model: ${selected} (${healthyModels.length}/${availableModels.length} healthy from provided list)`);
    return selected;
}

async function tryPollinationsText(prompt: string, maxAttempts: number = 3, specificModels?: string[]): Promise<string | null> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        // Rotate models for better chance of success
        const model = getRandomModel(specificModels);
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
                const status = pollinationsResponse.status;
                console.log(`Pollinations ${model} failed with status ${status}`);

                // Record failure with error code
                recordModelFailure(model, status);

                if (attempt < maxAttempts) await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }

            const text = await pollinationsResponse.text();
            if (!text || text.length < 50) {
                console.log(`Pollinations ${model} returned insufficient text`);
                recordModelFailure(model);
                if (attempt < maxAttempts) await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }

            console.log(`✅ Text generated successfully with Pollinations.ai (${model})`);
            recordModelSuccess(model); // Record success
            return text;
        } catch (error: any) {
            console.log(`Pollinations ${model} error: ${error.message}`);
            recordModelFailure(model);
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

        // Strategy: Gemini SDK -> Pollinations (Gemini) -> Pollinations (Others)

        // 1. Try Gemini SDK first (2 attempts) - Primary
        if (apiKey) {
            for (let i = 1; i <= 2; i++) {
                const geminiResult = await tryGemini(prompt);
                if (geminiResult) return geminiResult;
                if (i < 2) await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } else {
            console.log("Skipping Gemini SDK (no API key)");
        }

        // 2. Try Pollinations with Gemini model specifically (2 attempts)
        console.log("Falling back to Pollinations (Gemini only)...");
        const polyGeminiResult = await tryPollinationsText(prompt, 2, ["gemini", "gemini-search"]);
        if (polyGeminiResult) return polyGeminiResult;

        // 3. Fallback to other Pollinations models (2 attempts)
        console.log("Falling back to other Pollinations models...");
        const otherModels = POLLINATIONS_MODELS.filter(m => !m.includes("gemini"));
        const polyResult = await tryPollinationsText(prompt, 2, otherModels);
        if (polyResult) return polyResult;

        // If we're looping, wait a bit longer
        if (loop < MAX_LOOPS) await new Promise(resolve => setTimeout(resolve, 3000));
    }

    throw new Error("Text generation failed after exhausting all strategies (Gemini SDK -> Pollinations Gemini -> Pollinations Others)");
} 