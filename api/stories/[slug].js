import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
    const { slug } = req.query;
    const storiesPath = path.join(process.cwd(), 'data', 'stories.json');
    const stories = JSON.parse(fs.readFileSync(storiesPath, 'utf-8'));

    const story = stories.find(s => s.slug === slug);

    if (!story) {
        return res.status(404).json({ error: 'Story not found' });
    }

    res.status(200).json(story);
}
