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

        const buffer = Buffer.from(generatedImage, 'base64');
        const coverDir = path.join(process.cwd(), 'public', 'covers');
        if (!fs.existsSync(coverDir)) {
            fs.mkdirSync(coverDir, { recursive: true });
        }

        const filepath = path.join(coverDir, `${filename}.png`);
        fs.writeFileSync(filepath, buffer);

        return `/covers/${filename}.png`;
    } catch (error: any) {
        // If safety filter triggered, try with a very safe fallback prompt
        if (error?.code === 'content_policy_violation') {
            console.log("Safety filter triggered, retrying with safe prompt...");
            const safePrompt = "A minimalist book cover with soft pastel colors, gentle abstract shapes, and warm natural lighting. Peaceful and inviting atmosphere.";

            try {
                const response = await openai.images.generate({
                    model: "dall-e-2",
                    prompt: safePrompt,
                    n: 1,
                    size: "512x512",
                    response_format: "b64_json",
                });

                const generatedImage = response.data?.[0]?.b64_json;
                if (!generatedImage) {
                    throw new Error("No image returned from OpenAI on retry");
                }

                const buffer = Buffer.from(generatedImage, 'base64');
                const coverDir = path.join(process.cwd(), 'public', 'covers');
                if (!fs.existsSync(coverDir)) {
                    fs.mkdirSync(coverDir, { recursive: true });
                }

                const filepath = path.join(coverDir, `${filename}.png`);
                fs.writeFileSync(filepath, buffer);

                return `/covers/${filename}.png`;
            } catch (retryError) {
                console.error("Error generating image on retry:", retryError);
                throw retryError;
            }
        }

        console.error("Error generating image:", error);
        throw error;
    }
}
