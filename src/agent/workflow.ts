import { generateText } from "../lib/gemini";
import { generateImage } from "../lib/imagen";
import { saveStory } from "../lib/storage";
import type { Story } from "../types";
import type {
    PlanOutput,
    GenerationOutput,
    RevisionOutput,
    CoverPromptOutput,
    PackagingOutput,
} from "../types";

// --- Prompts ---

const PLANNING_PROMPT = `
You are an expert story planner.
Generate a plan for a daily short story based on the following criteria:

**GENRE DISTRIBUTION - MUST FOLLOW:**
- 45% chance: slice of life
- 25% chance: romance subtle  
- 15% chance: dark comedy
- 10% chance: thriller ringan
- 5% chance: sci-fi ringan
- **AVOID fantasy urban** - use slice of life or romance instead!

**TONE DISTRIBUTION:**
- 35% chance: optimis pelan (feel-good, uplifting)
- 25% chance: introspektif menenangkan (self-reflection, calming, psychological)
- 20% chance: humoris sinis (sarcastic comedy)
- 15% chance: melankolis lembut (soft melancholy)
- 5% chance: misterius ringan (light mystery)

**THEME VARIETY - ROTATE THESE:**
- Introspeksi & self-discovery (penyesalan, pembelajaran hidup, memaafkan diri)
- Psikologi sehari-hari (anxiety, overthinking, finding peace)
- Hubungan manusia (persahabatan, keluarga, stranger kindness)
- Rutinitas & mindfulness (menemukan makna dalam hal kecil)
- Nostalgia & kenangan (childhood, old places, memories)
- Perubahan & adaptasi (moving on, new beginnings, letting go)
- Kebaikan kecil (random acts of kindness, paying it forward)

**SETTING VARIETY - MUST ROTATE (NO COFFEE SHOPS!):**
- 🏢 Office/workplace (cubicle, meeting room, pantry)
- 🏫 School/campus (classroom, library, canteen)
- 🏠 Home (bedroom, kitchen, rooftop, balcony)
- 🌳 Outdoor (park, jogging track, riverside, playground)
- 🚌 Transportation (bus, train, ojek online, taxi)
- 🏪 Retail (minimarket, bookstore, laundry, salon)
- 🏥 Public services (clinic, post office, bank, government office)
- 🌆 Urban spaces (pedestrian bridge, alley, apartment lobby, elevator)
- 🎭 Cultural (museum, art gallery, old cinema, traditional market)
- 🌙 Night scenes (late-night convenience store, empty street, rooftop at night)

**CHARACTER VARIETY - AVOID BARISTAS:**
- Office worker, teacher, student, freelancer
- Ojek driver, security guard, cleaner, cashier
- Elderly person, single parent, young professional
- Artist, writer, musician, photographer
- Delivery person, street vendor, shop owner

**CRITICAL ANTI-REPETITION RULES:**
- Language: Bahasa Indonesia (casual) with optional natural English or simple Mandarin
- **NO coffee shops, cafes, or barista characters!**
- **MANDATORY VARIETY** - You MUST create something COMPLETELY DIFFERENT from recent stories
- **AVOID these overused keywords in titles**: senja, balkon, jendela, taman, kopi, layar, atap
- **DO NOT repeat**: same genre 2x in a row, same setting type 2x in a row, same tone 2x in a row
- **MIX IT UP**: If you're unsure, pick from underused combinations:
  - Dark comedy + office setting + cynical character
  - Romance subtle + transportation + chance encounter
  - Thriller ringan + retail/public service + mystery element
  - Sci-fi ringan + urban spaces + technology twist

Output JSON only matching this schema:
{
  "plan_id": "string",
  "title_idea": "string",
  "genre": "string (pick from: slice of life, romance subtle, dark comedy, thriller ringan, sci-fi ringan)",
  "theme": "string (MUST be a full descriptive sentence, 10-20 words, explaining the story's core message or emotional journey. NOT just 2-3 words!)",
  "tone": "string (pick from: optimis pelan, introspektif menenangkan, humoris sinis, melankolis lembut, misterius ringan)",
  "narrative_structure": { "hook": "string", "conflict": "string", "climax": "string", "resolution": "string" },
  "constraints": { "target_min_words": 1000, "target_max_words": 1500, "style_notes": "string" },
  "backup_alternatives": ["string"],
  "publishing_intent": "string"
}
`;

const GENERATION_PROMPT = (plan: PlanOutput) => `
You are a skilled fiction writer. Write a complete story based on

${JSON.stringify(plan)}

CRITICAL:
- Write ONLY the story text, no meta commentary.
- Properly quotes all strings (use \"double quotes\", NOT smart quotes ' or ').
- Do NOT use backticks or special characters that break JSON.
- Target: ${plan.constraints.target_max_words} words
- **MINIMUM: 1000 words** (this is mandatory - do not write less!)
- Style: ${plan.tone}
- Language: Bahasa Indonesia casual with optional English or simple Mandarin

Output JSON only matching:

{
  "draft_text": "string (the complete story text)",
  "word_count": number
}
`;

const REVISION_PROMPT = (plan: PlanOutput, draft: GenerationOutput) => `
You are a story editor and revise this story based on the plan.

Plan: ${JSON.stringify(plan)}
Draft: ${JSON.stringify(draft)}

If quality flags are all "OK", just polish the text. If any are BAD, fix them.

**CRITICAL: The final story MUST be at least 1000 words!**
If the draft is shorter, expand it with more details, dialogue, and scenes.

Output JSON:

{
  "final_story_text": "string (the complete revised story)",
  "final_word_count": number
}
`;

const COVER_PROMPT = (storyText: string) => `
You are an experienced art director creating cover images for short stories. Create an image generation prompt based on this story excerpt:
"${storyText.substring(0, 500)}..."

IMPORTANT SAFETY GUIDELINES:
1. Focus on mood, atmosphere, and setting rather than specific people/faces
2. Use cinematic composition: rule of thirds, dramatic lighting, depth of field
3. Prefer environmental shots, objects, or silhouettes over detailed character portraits
4. Avoid uncanny valley by minimizing close-up faces or overly detailed human features
5. Use natural, warm lighting or atmospheric effects (golden hour, rain, fog, etc.)
6. Keep it simple and evocative - less is more
7. **CRITICAL**: Avoid potentially sensitive words like "alley", "dark", "shadow", "whisper", "mystery" - use safer alternatives like "street", "pathway", "soft lighting", "atmosphere", "intrigue"
8. **CRITICAL**: Do not mention body parts, violence, alcohol, or anything potentially sensitive
9. Focus on landscapes, objects, buildings, nature, and abstract concepts

STYLE EXAMPLES (choose one that fits the story):
- "Cinematic photography, shallow depth of field, warm color grading"
- "Moody atmospheric illustration, soft lighting, painterly style"
- "Minimalist composition, strong silhouettes, gentle lighting"
- "Lo-fi aesthetic, vintage film grain, nostalgic feel"

Output JSON only:
{
  "cover_prompt": "string (focus on safe, gentle descriptions of environment/mood/objects, avoid detailed faces and sensitive words)",
  "style": "string (cinematic style description)",
  "aspect_ratio": "4:5",
  "safety_notes": "string"
}
`;


const PACKAGING_PROMPT = (
    plan: PlanOutput,
    revision: RevisionOutput,
    cover: CoverPromptOutput
) => {
    const now = new Date().toISOString();
    const storyId = `story-${Date.now()}`;

    return `
You are a publisher. Package this story into a database record.

**IMPORTANT - USE CURRENT DATE:**
- created_at: ${now}
- updated_at: ${now}
- id: ${storyId}

Plan: ${JSON.stringify(plan)}
Final Text: ${JSON.stringify(revision)}
Cover Info: ${JSON.stringify(cover)}

Output JSON only with this EXACT structure:
{
  "story_record": {
    "id": "${storyId}",
    "slug": "string (kebab-case from title)",
    "title": "string (from plan.title_idea)",
    "genre": "string (from plan.genre)",
    "theme": "string (from plan.theme)",
    "tone": "string (from plan.tone)",
    "language": "id-mixed",
    "created_at": "${now}",
    "updated_at": "${now}",
    "status": "published",
    "tags": ["array of relevant tags"],
    "content": {
      "format": "markdown",
      "body": "string (from revision.final_story_text)"
    },
    "cover": {
      "prompt": "string (from cover.cover_prompt)",
      "style": "string (from cover.style)",
      "aspect_ratio": "string (from cover.aspect_ratio)"
    },
    "meta": {
      "plan_summary": "string (brief summary of the narrative)",
      "target_emotion": "string (emotion the story aims to evoke)",
      "reading_time_minutes": number,
      "keywords": ["array of SEO keywords"]
    }
  },
  "routing_preview": {
    "dashboard_path": "/dashboard",
    "detail_path_template": "/:slug",
    "detail_example": "/your-story-slug"
  }
}
`;
};


// --- Workflow Functions ---

export async function runPlanning(): Promise<PlanOutput> {
    console.log("--- Stage 1: Planning ---");

    // Add randomness to ensure different stories each time
    const randomSeed = Math.floor(Math.random() * 10000);
    const timestamp = Date.now();

    // Read recent stories to avoid repetition
    const { getStories } = await import("../lib/storage.js");
    const recentStories = getStories().slice(0, 5); // Get last 5 stories

    let recentPatternsText = "";
    if (recentStories.length > 0) {
        const patterns = recentStories.map(s => ({
            title: s.title,
            genre: s.genre,
            tone: s.tone,
            titleKeywords: s.title.toLowerCase().split(/\s+/).filter(w => w.length > 3)
        }));

        const usedGenres = patterns.map(p => p.genre).join(", ");
        const usedTones = patterns.map(p => p.tone).join(", ");
        const usedKeywords = [...new Set(patterns.flatMap(p => p.titleKeywords))].join(", ");

        recentPatternsText = `
**RECENT STORIES TO AVOID REPEATING:**
- Recent genres used: ${usedGenres}
- Recent tones used: ${usedTones}
- Recent title keywords: ${usedKeywords}
- Recent titles: ${patterns.map(p => p.title).join("; ")}

**YOU MUST:**
- Pick a DIFFERENT genre from the most recent story
- Pick a DIFFERENT tone from the most recent story
- Avoid using any of the recent title keywords
- Create a completely fresh concept and setting
`;
        console.log("Recent patterns detected:", { usedGenres, usedTones, usedKeywords: usedKeywords.substring(0, 100) });
    }

    const promptWithSeed = `${PLANNING_PROMPT}
${recentPatternsText}
**IMPORTANT - ENSURE UNIQUENESS:**
- Generation Seed: ${randomSeed}
- Timestamp: ${timestamp}
- You MUST create a completely DIFFERENT and UNIQUE story idea
- DO NOT repeat the same title, theme, or setting as before
- Be creative and generate something fresh and original!
`;

    let rawResponse = await generateText(promptWithSeed);

    // Try parsing with cleaning
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
        try {
            // Clean and parse
            const cleaned = cleanJsonResponse(rawResponse);
            const result = JSON.parse(cleaned) as PlanOutput;

            console.log("Plan created:", result.title_idea);
            return result;

        } catch (error: any) {
            attempts++;
            console.log(`Failed to parse Planning JSON (attempt ${attempts}/${maxAttempts}). Error: ${error.message}`);
            console.log("Raw response preview:", rawResponse.substring(0, 500) + "... (truncated)");

            if (attempts >= maxAttempts) {
                throw new Error(`JSON parsing failed after ${maxAttempts} attempts: ${error.message}. The LLM returned invalid JSON.`);
            }

            // Retry with more explicit instructions
            console.log("Retrying with stricter JSON instructions...");
            const strictPrompt = `${promptWithSeed}

**CRITICAL JSON FORMATTING:**
- Output ONLY valid JSON, nothing else
- Do not wrap in markdown code blocks (no \`\`\`json)
- Properly escape all quotes inside strings using \\"
- Ensure all brackets and braces are properly closed
- Replace all literal newlines in strings with \\n
- Replace all literal tabs with \\t`;

            rawResponse = await generateText(strictPrompt);
        }
    }

    throw new Error("Failed to generate valid JSON after all attempts");
}

// Helper: Clean potentially malformed JSON from LLMs
function cleanJsonResponse(rawText: string): string {
    // Step 1: Try to extract JSON from markdown code blocks
    const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
        rawText = jsonMatch[1];
    }

    // Step 2: Try to extract JSON object
    const objectMatch = rawText.match(/\{[\s\S]*\}/);
    if (objectMatch) {
        rawText = objectMatch[0];
    }

    // Step 3: Fix common JSON issues
    let cleaned = rawText
        // Remove BOM and other invisible characters
        .replace(/^\uFEFF/, '')
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
        // Fix smart quotes
        .replace(/['']/g, "'")
        .replace(/[""]/g, '"')
        // Fix escaped quotes that shouldn't be escaped
        .replace(/\\'/g, "'")
        // Remove trailing commas
        .replace(/,(\s*[}\]])/g, '$1')
        // Fix newlines in strings (but preserve them in JSON structure)
        .replace(/"([^"]*?)"/g, (match, content) => {
            // Only escape unescaped newlines within quoted strings
            const escaped = content
                .replace(/\\/g, '\\\\')  // Escape backslashes first
                .replace(/\n/g, '\\n')   // Escape newlines
                .replace(/\r/g, '\\r')   // Escape carriage returns
                .replace(/\t/g, '\\t');  // Escape tabs
            return `"${escaped}"`;
        });

    return cleaned;
}


// --- Workflow Functions ---

export async function runGeneration(plan: PlanOutput): Promise<GenerationOutput> {
    console.log("--- Stage 2: Generation ---");

    const prompt = GENERATION_PROMPT(plan);
    let rawResponse = await generateText(prompt);

    // Try parsing with cleaning
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
        try {
            // Clean and parse
            const cleaned = cleanJsonResponse(rawResponse);
            const result = JSON.parse(cleaned) as GenerationOutput;

            const wordCount = result.raw_story_text?.split(/\s+/).length;
            console.log("Draft generated:", wordCount, "words");
            return result;

        } catch (error: any) {
            attempts++;
            console.log(`Failed to parse Generation JSON (attempt ${attempts}/${maxAttempts}). Raw response preview:`);
            console.log(rawResponse.substring(0, 500) + "... (truncated)");

            if (attempts >= maxAttempts) {
                throw new Error(`JSON parsing failed after ${maxAttempts} attempts: ${error.message}. The LLM returned invalid JSON.`);
            }

            // Retry with more explicit instructions
            console.log("Retrying with stricter JSON instructions...");
            const strictPrompt = `${prompt}

**CRITICAL JSON FORMATTING:**
- Output ONLY valid JSON, nothing else
- Properly escape all quotes inside strings using \\"
- Do not include markdown code blocks
- Ensure all brackets and braces are properly closed`;

            rawResponse = await generateText(strictPrompt);
        }
    }

    throw new Error("Failed to generate valid JSON after all attempts");
}

export async function runRevision(
    plan: PlanOutput,
    draft: GenerationOutput
): Promise<RevisionOutput> {
    console.log("--- Stage 3: Revision ---");

    const prompt = REVISION_PROMPT(plan, draft);
    let rawResponse = await generateText(prompt);

    // Try parsing with cleaning
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
        try {
            // Clean and parse
            const cleaned = cleanJsonResponse(rawResponse);
            const result = JSON.parse(cleaned) as RevisionOutput;

            console.log("Revision completed:", result.final_word_count, "words");
            return result;

        } catch (error: any) {
            attempts++;
            console.log(`Failed to parse Revision JSON (attempt ${attempts}/${maxAttempts}). Error: ${error.message}`);
            console.log("Raw response preview:", rawResponse.substring(0, 500) + "... (truncated)");

            if (attempts >= maxAttempts) {
                throw new Error(`JSON parsing failed after ${maxAttempts} attempts: ${error.message}. The LLM returned invalid JSON.`);
            }

            // Retry with more explicit instructions
            console.log("Retrying with stricter JSON instructions...");
            const strictPrompt = `${prompt}

**CRITICAL JSON FORMATTING:**
- Output ONLY valid JSON, nothing else
- Properly escape all quotes inside strings using \\"
- Do not include markdown code blocks
- Ensure all brackets and braces are properly closed
- Replace all literal newlines in strings with \\n
- Replace all literal tabs with \\t`;

            rawResponse = await generateText(strictPrompt);
        }
    }

    throw new Error("Failed to generate valid JSON after all attempts");
}

export async function runCoverPrompt(storyText: string): Promise<CoverPromptOutput> {
    console.log("--- Stage 4: Cover Prompt ---");
    const raw = await generateText(COVER_PROMPT(storyText));

    try {
        return JSON.parse(raw) as CoverPromptOutput;
    } catch (firstError) {
        console.log("Initial JSON parse failed, cleaning up...");
        try {
            let cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '');
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (jsonMatch) cleaned = jsonMatch[0];
            cleaned = cleaned.replace(/'/g, '"').replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
            return JSON.parse(cleaned) as CoverPromptOutput;
        } catch (secondError) {
            console.error("Cover prompt failed, using default");
            return {
                cover_prompt: "A minimalist illustration with soft colors",
                style: "Minimalist",
                aspect_ratio: "4:5",
                safety_notes: "safe, family-friendly"
            };
        }
    }
}

export async function runPackaging(
    plan: PlanOutput,
    revision: RevisionOutput,
    cover: CoverPromptOutput
): Promise<PackagingOutput> {
    console.log("--- Stage 5: Packaging ---");

    const prompt = PACKAGING_PROMPT(plan, revision, cover);
    let rawResponse = await generateText(prompt);

    // Try parsing with cleaning
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
        try {
            // Clean and parse
            const cleaned = cleanJsonResponse(rawResponse);
            const result = JSON.parse(cleaned) as PackagingOutput;

            console.log("Packaging completed for:", result.story_record.title);
            return result;

        } catch (error: any) {
            attempts++;
            console.log(`Failed to parse Packaging JSON (attempt ${attempts}/${maxAttempts}). Error: ${error.message}`);
            console.log("Raw response preview:", rawResponse.substring(0, 500) + "... (truncated)");

            if (attempts >= maxAttempts) {
                throw new Error(`JSON parsing failed after ${maxAttempts} attempts: ${error.message}. The LLM returned invalid JSON.`);
            }

            // Retry with more explicit instructions
            console.log("Retrying with stricter JSON instructions...");
            const strictPrompt = `${prompt}

**CRITICAL JSON FORMATTING:**
- Output ONLY valid JSON, nothing else
- Properly escape all quotes inside strings using \\"
- Do not include markdown code blocks
- Ensure all brackets and braces are properly closed
- Replace all literal newlines in strings with \\n
- Replace all literal tabs with \\t`;

            rawResponse = await generateText(strictPrompt);
        }
    }

    throw new Error("Failed to generate valid JSON after all attempts");
}

export async function runAgentCycle() {
    try {
        // 1. Planning
        const plan = await runPlanning();
        console.log(`Plan created: ${plan.title_idea} `);

        const draft = await runGeneration(plan);
        const revision = await runRevision(plan, draft);
        const coverPrompt = await runCoverPrompt(revision.final_story_text);
        const packaging = await runPackaging(plan, revision, coverPrompt);

        // Use slug for image generation (will save to stories/{slug}/cover.png)
        const slug = packaging.story_record.slug;

        console.log("Generating image...");
        const imageUrl = await generateImage(coverPrompt.cover_prompt, slug);

        const story: Story = {
            ...packaging.story_record,
            cover: {
                ...packaging.story_record.cover,
                image_url: imageUrl
            }
        };

        // Save to folder structure
        saveStory(story);

        console.log(`Story saved: ${story.slug}`);
    } catch (error) {
        console.error("Agent cycle failed:", error);
        throw error;
    }
}
