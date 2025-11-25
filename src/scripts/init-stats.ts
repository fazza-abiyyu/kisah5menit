import { getStories } from '../lib/storage.js';
import { getStats, updateStats } from '../lib/stats.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

const STATS_FILE = path.join(process.cwd(), 'public', 'stats', 'distribution.json');

/**
 * Initialize stats from existing stories
 */
async function initializeStats() {
    console.log('📊 Initializing distribution stats from existing stories...');

    // Get all existing stories
    const stories = getStories();
    console.log(`Found ${stories.length} existing stories`);

    if (stories.length === 0) {
        console.log('No stories found. Creating empty stats file.');
        const emptyStats = {
            last_updated: new Date().toISOString(),
            total_stories: 0,
            genres: {},
            tones: {},
            settings: {}
        };

        const statsDir = path.dirname(STATS_FILE);
        if (!fs.existsSync(statsDir)) {
            fs.mkdirSync(statsDir, { recursive: true });
        }
        fs.writeFileSync(STATS_FILE, JSON.stringify(emptyStats, null, 2));
        console.log('✅ Empty stats file created');
        return;
    }

    // Reset stats file
    const statsDir = path.dirname(STATS_FILE);
    if (!fs.existsSync(statsDir)) {
        fs.mkdirSync(statsDir, { recursive: true });
    }

    const initialStats = {
        last_updated: new Date().toISOString(),
        total_stories: 0,
        genres: {},
        tones: {},
        settings: {}
    };
    fs.writeFileSync(STATS_FILE, JSON.stringify(initialStats, null, 2));

    // Process each story
    for (const story of stories) {
        updateStats(story);
        console.log(`✓ Processed: ${story.title} (${story.genre})`);
    }

    // Display final stats
    const finalStats = getStats();
    console.log('\n📈 Final Distribution Stats:');
    console.log(`Total stories: ${finalStats.total_stories}`);
    console.log('\nGenres:');
    Object.entries(finalStats.genres).forEach(([genre, count]) => {
        const percentage = Math.round((count / finalStats.total_stories) * 100);
        console.log(`  ${genre}: ${count} (${percentage}%)`);
    });
    console.log('\nTones:');
    Object.entries(finalStats.tones).forEach(([tone, count]) => {
        const percentage = Math.round((count / finalStats.total_stories) * 100);
        console.log(`  ${tone}: ${count} (${percentage}%)`);
    });
    console.log('\nSettings:');
    Object.entries(finalStats.settings).forEach(([setting, count]) => {
        const percentage = Math.round((count / finalStats.total_stories) * 100);
        console.log(`  ${setting}: ${count} (${percentage}%)`);
    });

    console.log('\n✅ Stats initialization complete!');
}

initializeStats().catch(console.error);
