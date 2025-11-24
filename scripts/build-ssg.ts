import fs from 'fs';
import path from 'path';
import { marked } from 'marked';

const STORIES_DIR = path.join(process.cwd(), 'public', 'stories');
const OUTPUT_DIR = path.join(process.cwd(), 'public');
const TEMPLATE_PATH = path.join(process.cwd(), 'public', 'story.html');

interface Story {
    slug: string;
    title: string;
    genre: string;
    theme: string;
    tags: string[];
    created_at: string;
    updated_at: string;
    cover: {
        image_url: string;
    };
    content: {
        body: string;
    };
    meta: {
        reading_time_minutes: number;
    };
}

function generateStoryHTML(story: Story): string {
    const baseUrl = 'https://cerita5menit.vanila.app';
    const storyUrl = `${baseUrl}/${story.slug}`;
    const imageUrl = story.cover?.image_url ? `${baseUrl}${story.cover.image_url}` : `${baseUrl}/logo.png`;

    return `<!DOCTYPE html>
<html lang="id">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <title>${story.title} - Cerita 5 Menit</title>
  <meta name="description" content="${story.theme || story.title}">
  <meta name="keywords" content="${story.tags.join(', ')}">
  <meta name="author" content="Cerita 5 Menit">
  <meta name="robots" content="index, follow">
  <meta name="google-site-verification" content="xKXhXdDFMOe26zXW5IJnd7gCStzIWD6RfErfVQ-Nops" />
  
  <link rel="canonical" href="${storyUrl}">
  
  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Cerita 5 Menit">
  <meta property="og:locale" content="id_ID">
  <meta property="og:title" content="${story.title}">
  <meta property="og:description" content="${story.theme || story.title}">
  <meta property="og:url" content="${storyUrl}">
  <meta property="og:image" content="${imageUrl}">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${story.title}">
  <meta name="twitter:description" content="${story.theme || story.title}">
  <meta name="twitter:image" content="${imageUrl}">
  
  <link rel="icon" type="image/png" href="/logo.png">
  <link rel="stylesheet" href="/style.css?v=2">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  
  <!-- JSON-LD Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "${story.title}",
    "description": "${story.theme}",
    "image": "${imageUrl}",
    "datePublished": "${story.created_at}",
    "dateModified": "${story.updated_at}",
    "author": {
      "@type": "Organization",
      "name": "Cerita 5 Menit"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Cerita 5 Menit",
      "logo": {
        "@type": "ImageObject",
        "url": "${baseUrl}/logo.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "${storyUrl}"
    },
    "genre": "${story.genre}",
    "keywords": "${story.tags.join(', ')}",
    "wordCount": ${story.content.body.split(/\s+/).length},
    "timeRequired": "PT${story.meta.reading_time_minutes}M"
  }
  </script>
  
  <!-- Breadcrumb Schema -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "${baseUrl}"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "${story.title}",
        "item": "${storyUrl}"
      }
    ]
  }
  </script>
</head>

<body>
  <header class="site-header">
    <div class="header-container">
      <div class="header-brand">
        <img src="/logo.png" alt="Cerita 5 Menit" class="logo">
        <div class="brand-text">
          <h2 class="brand-name">Cerita 5 Menit</h2>
          <p class="brand-tagline">Cerita pendek untuk menemani waktu</p>
        </div>
      </div>
      <nav class="nav-links">
        <!-- Empty nav for consistency -->
      </nav>
    </div>
  </header>

  <div class="container" style="padding-top: 2rem;">
    <a href="/" class="back-link">← Back to Home</a>

    <div class="story-detail">
      <div class="story-header">
        <div class="card-meta">${story.genre.toUpperCase()} • ${story.meta.reading_time_minutes} MIN READ</div>
        <h1>${story.title}</h1>
        <div class="card-theme">${story.theme}</div>
      </div>
      <center>
        <img src="${story.cover.image_url || ''}" class="story-cover" alt="${story.title}" style="max-width: 300px; border-radius: 8px; margin: 2rem 0;">
      </center>
      <div class="story-body">${marked.parse(story.content.body)}</div>
      <div style="margin-top: 2rem; padding: 1.5rem; background: #f5f5f5; border-radius: 8px;">
        <p style="margin: 0; color: #666;"><strong>Tags:</strong> ${story.tags.map(tag => tag.toLowerCase()).join(', ')}</p>
      </div>
    </div>
  </div>

  <footer class="site-footer">
    <div class="container footer-container">
      <div class="footer-content">
        <img src="/logo.png" alt="Cerita 5 Menit Logo" class="footer-logo">
        <p class="footer-text">Cerita pendek yang menemani hari-harimu</p>
        <p class="footer-copyright">© 2025 Cerita 5 Menit • Made with ❤️</p>
      </div>
    </div>
  </footer>
</body>

</html>`;
}

async function buildSSG() {
    console.log('🔨 Building SSG pages...');

    if (!fs.existsSync(STORIES_DIR)) {
        console.error('❌ Stories directory not found');
        process.exit(1);
    }

    const slugs = fs.readdirSync(STORIES_DIR);
    let generated = 0;

    for (const slug of slugs) {
        const storyDir = path.join(STORIES_DIR, slug);
        if (!fs.statSync(storyDir).isDirectory()) continue;

        const metaPath = path.join(storyDir, 'meta.json');
        const contentPath = path.join(storyDir, 'index.md');

        if (!fs.existsSync(metaPath) || !fs.existsSync(contentPath)) {
            console.warn(`⚠️  Skipping ${slug} - missing files`);
            continue;
        }

        try {
            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
            const contentBody = fs.readFileSync(contentPath, 'utf-8');

            const story: Story = {
                slug,
                ...meta,
                content: {
                    body: contentBody
                }
            };

            const html = generateStoryHTML(story);
            const outputPath = path.join(OUTPUT_DIR, `${slug}.html`);

            fs.writeFileSync(outputPath, html, 'utf-8');
            console.log(`✅ Generated: ${slug}.html`);
            generated++;
        } catch (error) {
            console.error(`❌ Error generating ${slug}:`, error);
        }
    }

    console.log(`\n🎉 SSG build complete! Generated ${generated} pages.`);
}

buildSSG().catch(console.error);
