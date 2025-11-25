import fs from 'fs';
import path from 'path';

const HEALTH_FILE = path.join(process.cwd(), 'data', 'model-health.json');
const COOLDOWN_DAYS = 3; // Blacklist for 3 days
const MIN_FAILURES_TO_BLACKLIST = 3; // Need 3 consecutive failures

interface ModelHealth {
    model: string;
    consecutiveFailures: number;
    lastFailureTime?: string;
    blacklistedUntil?: string;
    totalAttempts: number;
    totalSuccesses: number;
    lastTestedTime?: string;
}

interface HealthData {
    models: Record<string, ModelHealth>;
    lastUpdated: string;
}

function getHealthData(): HealthData {
    try {
        if (fs.existsSync(HEALTH_FILE)) {
            return JSON.parse(fs.readFileSync(HEALTH_FILE, 'utf-8'));
        }
    } catch (error) {
        console.warn('Failed to read model health data:', error);
    }

    return {
        models: {},
        lastUpdated: new Date().toISOString()
    };
}

function saveHealthData(data: HealthData): void {
    try {
        const dir = path.dirname(HEALTH_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        data.lastUpdated = new Date().toISOString();
        fs.writeFileSync(HEALTH_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.warn('Failed to save model health data:', error);
    }
}

export function isModelBlacklisted(model: string): boolean {
    const data = getHealthData();
    const modelHealth = data.models[model];

    if (!modelHealth?.blacklistedUntil) {
        return false;
    }

    const blacklistedUntil = new Date(modelHealth.blacklistedUntil);
    const now = new Date();

    if (now < blacklistedUntil) {
        const hoursLeft = Math.ceil((blacklistedUntil.getTime() - now.getTime()) / (1000 * 60 * 60));
        console.log(`⛔ Model ${model} is blacklisted for ${hoursLeft} more hours`);
        return true;
    }

    // Cooldown expired, remove blacklist
    console.log(`✅ Model ${model} cooldown expired, re-enabling`);
    modelHealth.blacklistedUntil = undefined;
    modelHealth.consecutiveFailures = 0;
    saveHealthData(data);
    return false;
}

export function recordModelFailure(model: string, errorCode?: number): void {
    const data = getHealthData();

    if (!data.models[model]) {
        data.models[model] = {
            model,
            consecutiveFailures: 0,
            totalAttempts: 0,
            totalSuccesses: 0
        };
    }

    const modelHealth = data.models[model];
    modelHealth.consecutiveFailures++;
    modelHealth.totalAttempts++;
    modelHealth.lastFailureTime = new Date().toISOString();
    modelHealth.lastTestedTime = new Date().toISOString();

    // Blacklist if too many consecutive failures
    if (modelHealth.consecutiveFailures >= MIN_FAILURES_TO_BLACKLIST) {
        const blacklistUntil = new Date();
        blacklistUntil.setDate(blacklistUntil.getDate() + COOLDOWN_DAYS);
        modelHealth.blacklistedUntil = blacklistUntil.toISOString();

        console.log(`🚫 Model ${model} blacklisted until ${blacklistUntil.toISOString()} (${modelHealth.consecutiveFailures} consecutive failures, error: ${errorCode || 'unknown'})`);
    } else {
        console.log(`⚠️  Model ${model} failure ${modelHealth.consecutiveFailures}/${MIN_FAILURES_TO_BLACKLIST} (error: ${errorCode || 'unknown'})`);
    }

    saveHealthData(data);
}

export function recordModelSuccess(model: string): void {
    const data = getHealthData();

    if (!data.models[model]) {
        data.models[model] = {
            model,
            consecutiveFailures: 0,
            totalAttempts: 0,
            totalSuccesses: 0
        };
    }

    const modelHealth = data.models[model];
    modelHealth.consecutiveFailures = 0; // Reset on success
    modelHealth.totalAttempts++;
    modelHealth.totalSuccesses++;
    modelHealth.lastTestedTime = new Date().toISOString();

    // Remove blacklist if it was blacklisted
    if (modelHealth.blacklistedUntil) {
        console.log(`✅ Model ${model} recovered, removing blacklist`);
        modelHealth.blacklistedUntil = undefined;
    }

    saveHealthData(data);
}

export function getHealthyModels(allModels: string[]): string[] {
    return allModels.filter(model => !isModelBlacklisted(model));
}

export function getModelStats(): HealthData {
    return getHealthData();
}

export function resetModelHealth(model: string): void {
    const data = getHealthData();
    if (data.models[model]) {
        delete data.models[model];
        saveHealthData(data);
        console.log(`🔄 Reset health data for model: ${model}`);
    }
}
