import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("GEMINI_API_KEY is not set in .env");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

export async function generateText(prompt: string): Promise<string> {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        console.log("Gemini Response Keys:", Object.keys(response));
        // console.log("Gemini Response:", JSON.stringify(response, null, 2));

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
        return text;
    } catch (error) {
        console.error("Error generating text:", error);
        throw error;
    }
}
