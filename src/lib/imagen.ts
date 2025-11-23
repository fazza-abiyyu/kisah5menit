import OpenAI from "openai";
import * as fs from "node:fs";
import * as path from "node:path";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI({ apiKey: apiKey || "" });

export async function generateImage(prompt: string, filename: string): Promise<string> {
    try {
        // User requested "gpt-image-1-mini" for low quality. 
        // Mapping to dall-e-2 as it is the lower cost/quality option compared to dall-e-3.
        const response = await openai.images.generate({
            model: "dall-e-2",
            prompt,
            n: 1,
            size: "512x512", // Standard size for DALL-E 2
            response_format: "b64_json",
        });

        const generatedImage = response.data?.[0]?.b64_json;
        if (!generatedImage) {
            throw new Error("No image returned from OpenAI");
        }

        const buffer = Buffer.from(generatedImage, "base64");
        const publicDir = path.join(process.cwd(), "public", "covers");

        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
        }

        const filePath = path.join(publicDir, filename);
        fs.writeFileSync(filePath, buffer);

        return `/covers/${filename}`;
    } catch (error) {
        console.error("Error generating image:", error);
        throw error;
    }
}
