import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
    const storiesDir = path.join(process.cwd(), 'public', 'stories');
    const baseUrl = 'https://cerita5menit.vanila.app';

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

    // Read all story folders
    try {
        if (fs.existsSync(storiesDir)) {
            const slugs = fs.readdirSync(storiesDir);

            slugs.forEach(slug => {
                const metaPath = path.join(storiesDir, slug, 'meta.json');

                if (fs.existsSync(metaPath)) {
                    try {
                        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));

                        if (meta.status === 'published') {
                            const imageUrl = meta.cover?.image_url
                                ? `${baseUrl}${meta.cover.image_url}`
                                : `${baseUrl}/logo.png`;

                            xml += `
  <url>
    <loc>${baseUrl}/${slug}</loc>
    <lastmod>${meta.updated_at || meta.created_at}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <image:image>
      <image:loc>${imageUrl}</image:loc>
      <image:title>${meta.title}</image:title>
      <image:caption>${meta.theme || meta.title}</image:caption>
    </image:image>
  </url>`;
                        }
                    } catch (err) {
                        console.error(`Error reading meta for ${slug}:`, err);
                    }
                }
            });
        }
    } catch (err) {
        console.error('Error generating stories sitemap:', err);
    }

    xml += '\n</urlset>';

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.status(200).send(xml);
}
