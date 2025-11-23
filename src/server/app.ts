import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import { getStoriesFromFolders, getStoryFromFolder } from "../lib/storage";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(process.cwd(), "public")));

// API Routes
app.get("/api/stories", (req, res) => {
    const { genre, search } = req.query;
    let stories = getStoriesFromFolders(); // Use folder-based storage

    if (genre) {
        stories = stories.filter((s) => s.genre.toLowerCase() === (genre as string).toLowerCase());
    }

    if (search) {
        const q = (search as string).toLowerCase();
        stories = stories.filter(
            (s) =>
                s.title.toLowerCase().includes(q) ||
                s.theme.toLowerCase().includes(q) ||
                s.tags.some((t) => t.toLowerCase().includes(q))
        );
    }

    // Sort by date desc
    stories.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    res.json(stories);
});

app.get("/api/stories/:slug", (req, res) => {
    const story = getStoryFromFolder(req.params.slug); // Use folder-based storage
    if (!story) {
        return res.status(404).json({ error: "Story not found" });
    }
    res.json(story);
});

// Frontend Routes
app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(process.cwd(), "public", "index.html"));
});

app.get("/:slug", (req, res) => {
    // If it looks like a file extension, ignore (let static handler take it)
    if (req.params.slug.includes(".")) {
        return res.status(404).send("Not found");
    }
    res.sendFile(path.join(process.cwd(), "public", "story.html"));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Dashboard: http://localhost:${PORT}/dashboard`);
});

export default app;
