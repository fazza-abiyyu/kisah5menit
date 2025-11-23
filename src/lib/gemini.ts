import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("GEMINI_API_KEY is not set in .env");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

// Pollinations.ai models for text generation (rotated randomly for balance)
const POLLINATIONS_MODELS = [
    "openai",           // GPT-5 Nano
    "openai-fast",      // GPT-4.1 Nano (faster)
    "gemini",           // Gemini 2.5 Flash Lite
    "deepseek"          // DeepSeek V3.1
];

function getRandomModel(): string {
    return POLLINATIONS_MODELS[Math.floor(Math.random() * POLLINATIONS_MODELS.length)];
}

async function tryPollinationsText(prompt: string): Promise<string | null> {
    // Try all models one by one
    for (const model of POLLINATIONS_MODELS) {
        try {
            console.log(`Trying Pollinations.ai with model: ${model}...`);
            const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=${model}&temperature=0.8`;

            const response = await fetch(url);
            if (!response.ok) {
                console.log(`Pollinations ${model} failed with status ${response.status}, trying next model...`);
                continue;
            }

            const text = await response.text();
            if (!text || text.length < 50) {
                console.log(`Pollinations ${model} returned insufficient text, trying next model...`);
                continue;
            }

            console.log(`✅ Text generated successfully with Pollinations.ai (${model})`);
            return text;
        } catch (error: any) {
            console.log(`Pollinations ${model} error: ${error.message}, trying next model...`);
            continue;
        }
    }

    // All models failed
    console.log("All Pollinations.ai models failed");
    return null;
}

async function tryGemini(prompt: string): Promise<string> {
    console.log("Falling back to Gemini API...");

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
        }
    });

    console.log("Gemini Response Keys:", Object.keys(response));

    let text: string | undefined;
    if (response.text) {
        text = response.text;
    } else {
        text = (response as any).candidates?.[0]?.content?.parts?.[0]?.text;
    }

    if (!text) {
        console.error("Full Response:", JSON.stringify(response, null, 2));
        throw new Error("No text returned from Gemini");
    }

    console.log("✅ Text generated successfully with Gemini API");
    return text;
}

export async function generateText(prompt: string): Promise<string> {
    try {
        // Priority 1: Try Pollinations.ai (free, no API key needed)
        const pollinationsResult = await tryPollinationsText(prompt);
        if (pollinationsResult) {
            return pollinationsResult;
        }

        // Priority 2: Fallback to Gemini if Pollinations failed
        console.log("Pollinations.ai failed, falling back to Gemini API...");
        return await tryGemini(prompt);

    } catch (error) {
        console.error("Error generating text:", error);
        throw error;
    }
}
