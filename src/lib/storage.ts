import * as fs from "node:fs";
import * as path from "node:path";
import type { Story } from "../types.js";

const STORIES_DIR = path.join(process.cwd(), "public", "stories");

/**
 * Save story to folder structure: stories/{slug}/
 * - index.md: story content
 * - cover.png: cover image (handled by imagen.ts)
 * - meta.json: metadata
 */
export function saveStory(story: Story): void {
    try {
        const storyDir = path.join(STORIES_DIR, story.slug);

        // Create story directory
        if (!fs.existsSync(storyDir)) {
            fs.mkdirSync(storyDir, { recursive: true });
        }

        // Write meta.json (without content body)
        const { content, ...meta } = story;
        const metaPath = path.join(storyDir, "meta.json");
        fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

        // Write index.md (content body)
        // Unescape newlines that were escaped during JSON parsing
        const contentPath = path.join(storyDir, "index.md");
        const unescapedContent = content.body
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\\\/g, '\\');
        fs.writeFileSync(contentPath, unescapedContent);

        console.log(`✅ Story saved to folder: ${storyDir}`);
    } catch (error) {
        console.error("Error saving story to folder:", error);
        throw error;
    }
}

/**
 * Get all stories from folder structure
 */
export function getStories(): Story[] {
    try {
        if (!fs.existsSync(STORIES_DIR)) {
            return [];
        }

        const stories: Story[] = [];
        const slugs = fs.readdirSync(STORIES_DIR);

        for (const slug of slugs) {
            const storyDir = path.join(STORIES_DIR, slug);
            if (!fs.statSync(storyDir).isDirectory()) continue;

            const metaPath = path.join(storyDir, "meta.json");
            if (!fs.existsSync(metaPath)) continue;

            try {
                const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
                const story: Story = {
                    ...meta,
                    content: {
                        format: "markdown",
                        body: "" // Content not needed for listing
                    }
                };

                // FORCE fix cover image URL to use new path (Vercel fix)
                if (story.cover) {
                    story.cover.image_url = `/stories/${slug}/cover.png`;
                }
                stories.push(story);
            } catch (e) {
                console.error(`Error reading meta for story ${slug}:`, e);
            }
        }

        // Sort by created_at descending (newest first)
        return stories.sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    } catch (error) {
        console.error("Error reading stories from folders:", error);
        return [];
    }
}

/**
 * Get single story from folder by slug
 */
export function getStory(slug: string): Story | undefined {
    try {
        const storyDir = path.join(STORIES_DIR, slug);
        const metaPath = path.join(storyDir, "meta.json");
        const contentPath = path.join(storyDir, "index.md");

        if (!fs.existsSync(metaPath) || !fs.existsSync(contentPath)) {
            return undefined;
        }

        const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
        const contentBody = fs.readFileSync(contentPath, "utf-8");

        const story = {
            ...meta,
            content: {
                format: "markdown",
                body: contentBody
            }
        };

        // FORCE fix cover image URL to use new path (Vercel fix)
        if (story.cover) {
            story.cover.image_url = `/stories/${slug}/cover.png`;
        }

        return story;
    } catch (error) {
        console.error(`Error reading story from folder ${slug}:`, error);
        return undefined;
    }
}

