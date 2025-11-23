import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
    const storiesPath = path.join(process.cwd(), 'data', 'stories.json');
    const stories = JSON.parse(fs.readFileSync(storiesPath, 'utf-8'));

    const { search, genre } = req.query;
    let filtered = stories.filter(s => s.status === 'published');

    if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(s =>
            s.title.toLowerCase().includes(q) ||
            s.theme.toLowerCase().includes(q)
        );
    }

    if (genre) {
        filtered = filtered.filter(s => s.genre === genre);
    }

    res.status(200).json(filtered);
}
