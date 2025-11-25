import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Story } from '../types.js';

const STATS_DIR = path.join(process.cwd(), 'public', 'stats');
const STATS_FILE = path.join(STATS_DIR, 'distribution.json');

export interface DistributionStats {
    last_updated: string;
    total_stories: number;
    genres: Record<string, number>;
    tones: Record<string, number>;
    settings: Record<string, number>;
}

// Expanded genre list for more variety
const GENRE_LIST = [
    'slice of life',
    'romance subtle',
    'dark comedy',
    'thriller ringan',
    'sci-fi ringan',
    'mystery ringan',        // NEW: light mystery/detective
    'drama keluarga',        // NEW: family drama
    'adventure ringan',      // NEW: light adventure
    'psychological'          // NEW: psychological introspection
];

// Expanded tone list for better emotional range
const TONE_LIST = [
    'optimis pelan',              // feel-good, uplifting
    'introspektif menenangkan',   // self-reflection, calming
    'humoris sinis',              // sarcastic comedy
    'melankolis lembut',          // soft melancholy
    'misterius ringan',           // light mystery
    'tenang reflektif',           // NEW: calm, reflective
    'ceria hangat',               // NEW: cheerful, warm
    'tegang ringan'               // NEW: light suspense
];

const SETTING_KEYWORDS = {
    home: [
        'rumah', 'kamar', 'balkon', 'jendela', 'atap', 'dapur', 'loteng',
        'teras', 'garasi', 'kamar mandi', 'lemari', 'ruang tamu',
        'meja makan', 'taman belakang', 'gudang', 'laundry area',
        'koridor rumah', 'gardern fence', 'patio', 'backyard'
    ],

    office: [
        'kantor', 'ruang rapat', 'meeting', 'cubicle', 'pantry', 'printer',
        'ruang tunggu', 'whiteboard', 'proyektor', 'co-working space',
        'lift kantor', 'ruang HR', 'server room', 'reception',
        'workspace', 'open office'
    ],

    outdoor: [
        'taman', 'park', 'jogging track', 'riverside', 'playground',
        'pantai', 'gunung', 'padang rumput', 'jalan setapak',
        'danau', 'kebun', 'sungai', 'padang pasir', 'tebing', 'bukit',
        'kawasan wisata alam'
    ],

    transportation: [
        'bus', 'kereta', 'train', 'ojek', 'taxi', 'gerbong', 'halte',
        'bandara', 'airport', 'terminal', 'stasiun', 'subway', 'angkot',
        'jalan tol', 'parkiran', 'carwash', 'rest area', 'charging ev'
    ],

    retail: [
        'minimarket', 'toko', 'pasar', 'bookstore', 'laundry', 'salon',
        'mall', 'mall corridor', 'foodcourt', 'coffee shop', 'cafe',
        'butik', 'barbershop', 'ATM gallery', 'optik', 'drugstore',
        'supermarket', 'counter pulsa'
    ],

    urban: [
        'jalan', 'trotoar', 'gang', 'alley', 'elevator', 'lobby',
        'rooftop', 'crosswalk', 'traffic light', 'park bench',
        'jembatan penyebrangan', 'gedung tinggi', 'construction site',
        'grafiti', 'underground passage', 'underpass', 'jalan layang'
    ],

    cultural: [
        'museum', 'gallery', 'cinema', 'bioskop', 'library', 'opera house',
        'teater', 'auditorium', 'studio seni', 'ruang pameran',
        'hall pertunjukan', 'studio musik', 'konser'
    ],

    night: [
        'malam', 'midnight', 'street light', 'night market',
        'club', 'pub', 'late shop', 'midnight drive', 'after hours',
        'bar', 'late cafe', 'park at night', 'empty streets', 'night pier'
    ]
};


/**
 * Initialize stats directory and file if they don't exist
 */
function ensureStatsFile(): void {
    if (!fs.existsSync(STATS_DIR)) {
        fs.mkdirSync(STATS_DIR, { recursive: true });
    }

    if (!fs.existsSync(STATS_FILE)) {
        const initialStats: DistributionStats = {
            last_updated: new Date().toISOString(),
            total_stories: 0,
            genres: {},
            tones: {},
            settings: {}
        };
        fs.writeFileSync(STATS_FILE, JSON.stringify(initialStats, null, 2));
    }
}

/**
 * Read current distribution stats
 */
export function getStats(): DistributionStats {
    ensureStatsFile();
    const data = fs.readFileSync(STATS_FILE, 'utf-8');
    return JSON.parse(data);
}

/**
 * Save stats to file
 */
function saveStats(stats: DistributionStats): void {
    ensureStatsFile();
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
}

/**
 * Detect setting from story title and tags
 */
function detectSetting(story: Story): string {
    const searchText = `${story.title} ${story.tags?.join(' ')}`.toLowerCase();

    for (const [setting, keywords] of Object.entries(SETTING_KEYWORDS)) {
        if (keywords.some(keyword => searchText.includes(keyword))) {
            return setting;
        }
    }

    return 'other';
}

/**
 * Update stats after successful story generation
 */
export function updateStats(story: Story): void {
    const stats = getStats();

    // Increment total
    stats.total_stories++;

    // Update genre count
    stats.genres[story.genre] = (stats.genres[story.genre] || 0) + 1;

    // Update tone count
    stats.tones[story.tone] = (stats.tones[story.tone] || 0) + 1;

    // Detect and update setting count
    const setting = detectSetting(story);
    stats.settings[setting] = (stats.settings[setting] || 0) + 1;

    // Update timestamp
    stats.last_updated = new Date().toISOString();

    saveStats(stats);
    console.log(`📊 Stats updated: ${story.genre} | ${story.tone} | ${setting}`);
}

/**
 * Get least used genre, tone, and setting
 */
export function getLeastUsed(): { genre: string; tone: string; setting: string } {
    const stats = getStats();

    // Find least used genre
    let leastGenre = GENRE_LIST[0];
    let minGenreCount = stats.genres[leastGenre] || 0;
    for (const genre of GENRE_LIST) {
        const count = stats.genres[genre] || 0;
        if (count < minGenreCount) {
            minGenreCount = count;
            leastGenre = genre;
        }
    }

    // Find least used tone
    let leastTone = TONE_LIST[0];
    let minToneCount = stats.tones[leastTone] || 0;
    for (const tone of TONE_LIST) {
        const count = stats.tones[tone] || 0;
        if (count < minToneCount) {
            minToneCount = count;
            leastTone = tone;
        }
    }

    // Find least used setting
    const settingKeys = Object.keys(SETTING_KEYWORDS);
    let leastSetting = settingKeys[0];
    let minSettingCount = stats.settings[leastSetting] || 0;
    for (const setting of settingKeys) {
        const count = stats.settings[setting] || 0;
        if (count < minSettingCount) {
            minSettingCount = count;
            leastSetting = setting;
        }
    }

    return {
        genre: leastGenre,
        tone: leastTone,
        setting: leastSetting
    };
}

/**
 * Calculate distribution percentages
 */
export function getDistributionPercentages(): {
    genres: Record<string, number>;
    tones: Record<string, number>;
    settings: Record<string, number>;
} {
    const stats = getStats();
    const total = stats.total_stories || 1; // Avoid division by zero

    const genrePercentages: Record<string, number> = {};
    for (const genre of GENRE_LIST) {
        const count = stats.genres[genre] || 0;
        genrePercentages[genre] = Math.round((count / total) * 100);
    }

    const tonePercentages: Record<string, number> = {};
    for (const tone of TONE_LIST) {
        const count = stats.tones[tone] || 0;
        tonePercentages[tone] = Math.round((count / total) * 100);
    }

    const settingPercentages: Record<string, number> = {};
    for (const setting of Object.keys(SETTING_KEYWORDS)) {
        const count = stats.settings[setting] || 0;
        settingPercentages[setting] = Math.round((count / total) * 100);
    }

    return {
        genres: genrePercentages,
        tones: tonePercentages,
        settings: settingPercentages
    };
}
