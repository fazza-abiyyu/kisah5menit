import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
    const storiesPath = path.join(process.cwd(), 'data', 'stories.json');
    const stories = JSON.parse(fs.readFileSync(storiesPath, 'utf-8'));

    const baseUrl = 'https://kisah5menit.vercel.app';
    const currentDate = new Date().toISOString();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

    // Add all published stories
    stories
        .filter(s => s.status === 'published')
        .forEach(story => {
            xml += `
  <url>
    <loc>${baseUrl}/${story.slug}</loc>
    <lastmod>${story.updated_at}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
        });

    xml += '\n</urlset>';

    res.setHeader('Content-Type', 'application/xml');
    res.status(200).send(xml);
}
