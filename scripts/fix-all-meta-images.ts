import fs from 'fs';
import path from 'path';

const STORIES_DIR = path.join(process.cwd(), 'public', 'stories');

function fixAllMetaImages() {
    if (!fs.existsSync(STORIES_DIR)) {
        console.error(`Stories directory not found: ${STORIES_DIR}`);
        return;
    }

    const slugs = fs.readdirSync(STORIES_DIR);
    let fixedCount = 0;

    for (const slug of slugs) {
        const storyDir = path.join(STORIES_DIR, slug);
        const metaPath = path.join(storyDir, 'meta.json');

        if (fs.statSync(storyDir).isDirectory() && fs.existsSync(metaPath)) {
            try {
                const metaContent = fs.readFileSync(metaPath, 'utf-8');
                const meta = JSON.parse(metaContent);

                // Unconditionally set the correct path
                const correctPath = `/stories/${slug}/cover.png`;

                if (meta.cover) {
                    if (meta.cover.image_url !== correctPath) {
                        console.log(`Fixing ${slug}: ${meta.cover.image_url} -> ${correctPath}`);
                        meta.cover.image_url = correctPath;
                        fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
                        fixedCount++;
                    }
                }
            } catch (error) {
                console.error(`Error processing ${slug}:`, error);
            }
        }
    }

    console.log(`\n✅ Fixed ${fixedCount} meta.json files.`);
}

fixAllMetaImages();
