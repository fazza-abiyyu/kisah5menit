import * as fs from "node:fs";
import * as path from "node:path";
import type { Story } from "../types.js";

// ===== OLD JSON-BASED STORAGE (keeping for backward compatibility) =====

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "stories.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure DB file exists
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([]));
}

export function getStories(): Story[] {
    try {
        const data = fs.readFileSync(DB_FILE, "utf-8");
        return JSON.parse(data) as Story[];
    } catch (error) {
        console.error("Error reading stories:", error);
        return [];
    }
}

export function saveStory(story: Story): void {
    const stories = getStories();
    const index = stories.findIndex((s) => s.id === story.id);
    if (index >= 0) {
        stories[index] = story;
    } else {
        stories.unshift(story);
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(stories, null, 2));
}

export function getStoryBySlug(slug: string): Story | undefined {
    const stories = getStories();
    return stories.find((s) => s.slug === slug);
}

// ===== NEW FOLDER-BASED STORAGE (Phase 1: Add new functions) =====

const STORIES_DIR = path.join(process.cwd(), "stories");

/**
 * Save story to folder structure: stories/{slug}/
 * - index.md: story content
 * - cover.png: cover image (handled by imagen.ts)
 * - meta.json: metadata
 */
export function saveStoryToFolder(story: Story): void {
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
        const contentPath = path.join(storyDir, "index.md");
        fs.writeFileSync(contentPath, content.body);

        console.log(`✅ Story saved to folder: ${storyDir}`);
    } catch (error) {
        console.error("Error saving story to folder:", error);
        throw error;
    }
}

/**
 * Get all stories from folder structure
 */
export function getStoriesFromFolders(): Story[] {
    try {
        if (!fs.existsSync(STORIES_DIR)) {
            return [];
        }

        const stories: Story[] = [];
        const slugs = fs.readdirSync(STORIES_DIR);

        for (const slug of slugs) {
            const storyDir = path.join(STORIES_DIR, slug);
            if (!fs.statSync(storyDir).isDirectory()) continue;

            const story = getStoryFromFolder(slug);
            if (story) {
                stories.push(story);
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
export function getStoryFromFolder(slug: string): Story | undefined {
    try {
        const storyDir = path.join(STORIES_DIR, slug);
        const metaPath = path.join(storyDir, "meta.json");
        const contentPath = path.join(storyDir, "index.md");

        if (!fs.existsSync(metaPath) || !fs.existsSync(contentPath)) {
            return undefined;
        }

        const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
        const contentBody = fs.readFileSync(contentPath, "utf-8");

        return {
            ...meta,
            content: {
                format: "markdown",
                body: contentBody
            }
        };
    } catch (error) {
        console.error(`Error reading story from folder ${slug}:`, error);
        return undefined;
    }
}
