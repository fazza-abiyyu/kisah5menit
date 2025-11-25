import { generateText } from "../lib/text-generation";
import type { BatchAgentOutput } from "../types";

const BATCH_PROMPT = `
You are StoryBatchAgent.
Generate a single short story and package it for a file-based CMS.

Rules:
- Language: Indonesian (casual), optional natural English mixed in.
- Optional: 1-2 Mandarin words with pinyin/meaning.
- Length: 250-700 words.
- No explicit content.
- Output MUST be valid JSON matching the schema below.

Schema:
{
  "story_record": {
    "id": "string (uuid or timestamp)",
    "slug": "string (kebab-case)",
    "title": "string",
    "genre": "string",
    "created_at": "ISO datetime",
    "tags": ["string"]
  },
  "file_artifacts": [
    {
      "path": "stories/<slug>.md",
      "content": "# Title\\n\\n_Genre: <genre>_\\n\\n<story text in markdown>"
    },
    {
      "path": "covers/<slug>.png",
      "image_prompt": "string (image generation prompt)",
      "note": "backend yang generate gambar berdasarkan prompt, bukan agent"
    }
  ]
}
`;

export async function runBatchAgent(): Promise<BatchAgentOutput> {
  try {
    const json = await generateText(BATCH_PROMPT);
    // Clean up potential markdown code blocks if Gemini adds them
    const cleanJson = json.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Batch Agent failed:", error);
    throw error;
  }
}
