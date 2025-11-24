import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const storiesDir = path.join(process.cwd(), 'public', 'stories');
  const baseUrl = 'https://cerita5menit.vanila.app';
  const currentDate = new Date().toISOString();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

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
              xml += `
  <url>
    <loc>${baseUrl}/${slug}</loc>
    <lastmod>${meta.updated_at || meta.created_at}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
            }
          } catch (err) {
            console.error(`Error reading meta for ${slug}:`, err);
          }
        }
      });
    }
  } catch (err) {
    console.error('Error generating sitemap:', err);
  }

  xml += '\n</urlset>';

  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  res.status(200).send(xml);
}
