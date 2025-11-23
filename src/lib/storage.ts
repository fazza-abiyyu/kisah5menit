import * as fs from "node:fs";
import * as path from "node:path";
import type { Story } from "../types.js";

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
    // Check if story already exists (update) or is new
    const index = stories.findIndex((s) => s.id === story.id);
    if (index >= 0) {
        stories[index] = story;
    } else {
        stories.unshift(story); // Add new stories to the top
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(stories, null, 2));
}

export function getStoryBySlug(slug: string): Story | undefined {
    const stories = getStories();
    return stories.find((s) => s.slug === slug);
}
