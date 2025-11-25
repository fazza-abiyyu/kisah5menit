import OpenAI from "openai";
import * as fs from "node:fs";
import * as path from "node:path";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI({ apiKey: apiKey || "" });

// Pollinations.ai image models to try in order (prioritized by reliability)
// Based on API: https://image.pollinations.ai/models
const POLLINATIONS_MODELS = ["gptimage", "turbo", "flux"];

async function tryPollinationsAI(prompt: string, slug: string): Promise<string | null> {
    for (const model of POLLINATIONS_MODELS) {
        try {
            console.log(`Trying Pollinations.ai with model: ${model}...`);
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=640&model=${model}&nologo=true`;

            const response = await fetch(url);
            if (!response.ok) {
                console.log(`Model ${model} failed with status ${response.status}`);
                continue;
            }

            const buffer = await response.arrayBuffer();

            // Save to public/stories/{slug}/cover.png
            const storyDir = path.join(process.cwd(), 'public', 'stories', slug);
            if (!fs.existsSync(storyDir)) {
                fs.mkdirSync(storyDir, { recursive: true });
            }

            const filepath = path.join(storyDir, 'cover.png');
            fs.writeFileSync(filepath, Buffer.from(buffer));

            console.log(`✅ Image generated successfully with Pollinations.ai (${model})`);
            return `/stories/${slug}/cover.png`;
        } catch (error: any) {
            console.log(`Model ${model} error:`, error.message);
            continue;
        }
    }

    return null; // All Pollinations models failed
}

async function tryOpenAI(prompt: string, slug: string): Promise<string> {
    console.log("Falling back to OpenAI DALL-E 2...");

    try {
        const response = await openai.images.generate({
            model: "dall-e-2",
            prompt,
            n: 1,
            size: "512x512",
            response_format: "b64_json",
        });

        const generatedImage = response.data?.[0]?.b64_json;
        if (!generatedImage) {
            throw new Error("No image returned from OpenAI");
        }

        const buffer = Buffer.from(generatedImage, 'base64');

        // Save to public/stories/{slug}/cover.png
        const storyDir = path.join(process.cwd(), 'public', 'stories', slug);
        if (!fs.existsSync(storyDir)) {
            fs.mkdirSync(storyDir, { recursive: true });
        }

        const filepath = path.join(storyDir, 'cover.png');
        fs.writeFileSync(filepath, buffer);

        console.log("✅ Image generated successfully with OpenAI DALL-E 2");
        return `/stories/${slug}/cover.png`;
    } catch (error: any) {
        // Last resort - try safe prompt
        if (error?.code === 'content_policy_violation') {
            console.log("OpenAI safety filter triggered, using safe fallback prompt...");
            const safePrompt = "A minimalist book cover with soft pastel colors, gentle abstract shapes, and warm natural lighting. Peaceful and inviting atmosphere.";

            const response = await openai.images.generate({
                model: "dall-e-2",
                prompt: safePrompt,
                n: 1,
                size: "512x512",
                response_format: "b64_json",
            });

            const generatedImage = response.data?.[0]?.b64_json;
            if (!generatedImage) {
                throw new Error("No image returned from OpenAI on safe retry");
            }

            const buffer = Buffer.from(generatedImage, 'base64');
            const storyDir = path.join(process.cwd(), 'public', 'stories', slug);
            if (!fs.existsSync(storyDir)) {
                fs.mkdirSync(storyDir, { recursive: true });
            }

            const filepath = path.join(storyDir, 'cover.png');
            fs.writeFileSync(filepath, buffer);

            console.log("✅ Image generated with OpenAI safe fallback");
            return `/stories/${slug}/cover.png`;
        }

        throw error;
    }
}

export async function generateImage(prompt: string, slug: string): Promise<string> {
    try {
        // Priority 1: Try Pollinations.ai (free, no API key needed)
        const pollinationsResult = await tryPollinationsAI(prompt, slug);
        if (pollinationsResult) {
            return pollinationsResult;
        }

        // Priority 2: Fallback to OpenAI if all Pollinations models failed
        console.log("All Pollinations.ai models failed, falling back to OpenAI...");
        return await tryOpenAI(prompt, slug);

    } catch (error) {
        console.error("Error generating image:", error);
        throw error;
    }
}
