import { generateText } from "../lib/gemini";
import { generateImage } from "../lib/imagen";
import { saveStory } from "../lib/storage";
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
- Genre: Randomly pick from [slice of life, thriller ringan, sci-fi ringan, fantasy urban, romance subtle, dark comedy]
- Tone: Randomly pick from [melankolis lembut, humoris sinis, optimis pelan, surreal, misterius ringan]
- Language: Bahasa Indonesia (casual) with optional natural English or simple Mandarin.

Output JSON only matching this schema:
{
  "plan_id": "string",
  "title_idea": "string",
  "genre": "string",
  "theme": "string",
  "tone": "string",
  "narrative_structure": { "hook": "string", "conflict": "string", "climax": "string", "resolution": "string" },
  "constraints": { "target_min_words": 1000, "target_max_words": 1500, "style_notes": "string" },
  "backup_alternatives": ["string"],
  "publishing_intent": "string"
}
`;

const GENERATION_PROMPT = (plan: PlanOutput) => `
You are a creative writer. Write a short story based on this plan:
${JSON.stringify(plan, null, 2)}

Rules:
- Follow the narrative structure.
- Maintain the tone and theme.
- Length: ${plan.constraints.target_min_words} - ${plan.constraints.target_max_words} words.
- Language: Bahasa Indonesia (casual). You may use 1-2 simple Mandarin words with pinyin/meaning if natural.
- No explicit content.

Output JSON only:
{
  "raw_story_text": "string (markdown allowed)",
  "word_count": number,
  "quality_flags": { "pacing_ok": boolean, "tone_consistent": boolean, "ending_clear": boolean, "theme_visible": boolean }
}
`;

const REVISION_PROMPT = (plan: PlanOutput, draft: GenerationOutput) => `
You are a story editor. Review and revise this draft:
Plan: ${JSON.stringify(plan)}
Draft: ${JSON.stringify(draft)}

If quality flags are all true, just polish the text. If any are false, fix them.

Output JSON only:
{
  "final_story_text": "string",
  "final_word_count": number
}
`;

const COVER_PROMPT = (storyText: string) => `
You are an experienced art director creating cover images for short stories. Create an image generation prompt based on this story excerpt:
"${storyText.substring(0, 500)}..."

IMPORTANT GUIDELINES:
1. Focus on mood, atmosphere, and setting rather than specific people/faces
2. Use cinematic composition: rule of thirds, dramatic lighting, depth of field
3. Prefer environmental shots, objects, or silhouettes over detailed character portraits
4. Avoid uncanny valley by minimizing close-up faces or overly detailed human features
5. Use natural, warm lighting or atmospheric effects (golden hour, rain, fog, etc.)
6. Keep it simple and evocative - less is more

STYLE EXAMPLES (choose one that fits the story):
- "Cinematic photography, shallow depth of field, warm color grading"
- "Moody atmospheric illustration, soft lighting, painterly style"
- "Minimalist composition, strong silhouettes, dramatic shadows"
- "Lo-fi aesthetic, vintage film grain, nostalgic feel"

Output JSON only:
{
  "cover_prompt": "string (focus on environment/mood/objects, avoid detailed faces)",
  "style": "string (cinematic style description)",
  "aspect_ratio": "4:5",
  "safety_notes": "string"
}
`;


const PACKAGING_PROMPT = (
    plan: PlanOutput,
    revision: RevisionOutput,
    cover: CoverPromptOutput
) => `
You are a publisher. Package this story into a database record.
Plan: ${JSON.stringify(plan)}
Final Text: ${JSON.stringify(revision)}
Cover Info: ${JSON.stringify(cover)}

Rules:
- Generate a unique ID using timestamp or UUID format
- Slug: kebab-case from title
- Status: "published"
- Language: "id-mixed" (for Indonesian with English/Mandarin mix)
- Tags: Extract 3-5 relevant tags from the story
- Estimate reading time (assume 200 words per minute)
- Use current timestamp for created_at and updated_at (ISO format)

Output JSON only with this EXACT structure:
{
  "story_record": {
    "id": "string (e.g., story-1732345678901)",
    "slug": "string (kebab-case)",
    "title": "string",
    "genre": "string (from plan.genre)",
    "theme": "string (from plan.theme)",
    "tone": "string (from plan.tone)",
    "language": "id-mixed",
    "created_at": "ISO timestamp",
    "updated_at": "ISO timestamp",
    "status": "published",
    "tags": ["string", "string", "string"],
    "content": {
      "format": "markdown",
      "body": "string (the final story text from revision)"
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
      "keywords": ["string", "string", "string"]
    }
  },
  "routing_preview": {
    "dashboard_path": "/dashboard",
    "detail_path_template": "/:slug",
    "detail_example": "/your-story-slug"
  }
}
`;

// --- Workflow Functions ---

export async function runPlanning(): Promise<PlanOutput> {
    console.log("--- Stage 1: Planning ---");
    const json = await generateText(PLANNING_PROMPT);
    return JSON.parse(json);
}

export async function runGeneration(plan: PlanOutput): Promise<GenerationOutput> {
    console.log("--- Stage 2: Generation ---");
    const json = await generateText(GENERATION_PROMPT(plan));
    return JSON.parse(json);
}

export async function runRevision(
    plan: PlanOutput,
    draft: GenerationOutput
): Promise<RevisionOutput> {
    console.log("--- Stage 3: Revision ---");
    const json = await generateText(REVISION_PROMPT(plan, draft));
    return JSON.parse(json);
}

export async function runCoverPrompt(storyText: string): Promise<CoverPromptOutput> {
    console.log("--- Stage 4: Cover Prompt ---");
    const json = await generateText(COVER_PROMPT(storyText));
    return JSON.parse(json);
}

export async function runPackaging(
    plan: PlanOutput,
    revision: RevisionOutput,
    cover: CoverPromptOutput
): Promise<PackagingOutput> {
    console.log("--- Stage 5: Packaging ---");
    const json = await generateText(PACKAGING_PROMPT(plan, revision, cover));
    return JSON.parse(json);
}

export async function runAgentCycle() {
    try {
        // 1. Planning
        const plan = await runPlanning();
        console.log(`Plan created: ${plan.title_idea}`);

        // 2. Generation
        const draft = await runGeneration(plan);
        console.log(`Draft generated: ${draft.word_count} words`);

        // 3. Revision
        const revision = await runRevision(plan, draft);
        console.log(`Revision complete: ${revision.final_word_count} words`);

        // 4. Cover Prompt
        const coverPrompt = await runCoverPrompt(revision.final_story_text);
        console.log(`Cover prompt: ${coverPrompt.cover_prompt}`);

        // 4b. Generate Actual Image
        console.log("Generating image...");
        const imageFilename = `${plan.plan_id || Date.now()}.png`;
        const imageUrl = await generateImage(coverPrompt.cover_prompt, imageFilename);
        console.log(`Image saved to ${imageUrl}`);

        // 5. Packaging
        const packaging = await runPackaging(plan, revision, coverPrompt);

        // Inject local image URL
        if (!packaging.story_record.cover) {
            packaging.story_record.cover = {
                prompt: coverPrompt.cover_prompt,
                style: coverPrompt.style,
                aspect_ratio: coverPrompt.aspect_ratio,
            };
        }
        packaging.story_record.cover.image_url = imageUrl;

        // Save to DB
        saveStory(packaging.story_record);
        console.log(`Story saved: ${packaging.story_record.slug}`);

        return packaging.story_record;
    } catch (error) {
        console.error("Agent cycle failed:", error);
        throw error;
    }
}
