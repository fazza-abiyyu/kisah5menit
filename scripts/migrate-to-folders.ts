import * as fs from "node:fs";
import * as path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const STORIES_JSON = path.join(DATA_DIR, "stories.json");
const STORIES_DIR = path.join(process.cwd(), "stories");
const OLD_COVERS_DIR = path.join(process.cwd(), "public", "covers");

interface Story {
    id: string;
    slug: string;
    title: string;
    content: {
        format: string;
        body: string;
    };
    cover?: {
        image_url?: string;
        [key: string]: any;
    };
    [key: string]: any;
}

async function migrateStories() {
    console.log("🚀 Starting migration from JSON to folder structure...\n");

    // Read stories.json
    if (!fs.existsSync(STORIES_JSON)) {
        console.error("❌ stories.json not found!");
        return;
    }

    const storiesData = fs.readFileSync(STORIES_JSON, "utf-8");
    const stories: Story[] = JSON.parse(storiesData);

    console.log(`📊 Found ${stories.length} stories to migrate\n`);

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const story of stories) {
        try {
            const storyDir = path.join(STORIES_DIR, story.slug);

            // Check if already migrated
            if (fs.existsSync(storyDir) &&
                fs.existsSync(path.join(storyDir, "meta.json")) &&
                fs.existsSync(path.join(storyDir, "index.md"))) {
                console.log(`⏭️  Skipped: ${story.slug} (already exists)`);
                skippedCount++;
                continue;
            }

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

            // Copy cover image if exists
            if (story.cover?.image_url) {
                // Extract filename from URL (e.g., /covers/xyz.png -> xyz.png)
                const coverFilename = story.cover.image_url.split('/').pop();
                if (coverFilename) {
                    const oldCoverPath = path.join(OLD_COVERS_DIR, coverFilename);
                    const newCoverPath = path.join(storyDir, "cover.png");

                    if (fs.existsSync(oldCoverPath)) {
                        fs.copyFileSync(oldCoverPath, newCoverPath);
                        console.log(`✅ Migrated: ${story.slug} (with cover)`);
                    } else {
                        console.log(`✅ Migrated: ${story.slug} (cover not found)`);
                    }
                }
            } else {
                console.log(`✅ Migrated: ${story.slug}`);
            }

            successCount++;

        } catch (error) {
            console.error(`❌ Error migrating ${story.slug}:`, error);
            errorCount++;
        }
    }

    console.log("\n" + "=".repeat(50));
    console.log("📈 Migration Summary:");
    console.log(`   ✅ Migrated: ${successCount}`);
    console.log(`   ⏭️  Skipped:  ${skippedCount}`);
    console.log(`   ❌ Errors:   ${errorCount}`);
    console.log(`   📊 Total:    ${stories.length}`);
    console.log("=".repeat(50));

    if (successCount > 0) {
        console.log("\n✨ Migration completed successfully!");
        console.log("📁 Stories are now in: stories/{slug}/");
        console.log("   - index.md   (content)");
        console.log("   - meta.json  (metadata)");
        console.log("   - cover.png  (if available)");
    }
}

// Run migration
migrateStories().catch(console.error);
