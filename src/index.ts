import { runAgentCycle } from "./agent/workflow";

async function main() {
    console.log("Starting DailyStoryAgent...");

    // Parse arguments for gen=N
    const args = process.argv.slice(2);
    const genArg = args.find((arg) => arg.startsWith("gen="));
    const count = genArg ? parseInt(genArg.split("=")[1], 10) : 1;

    console.log(`Target generation count: ${count}`);

    for (let i = 0; i < count; i++) {
        console.log(`\n--- Story ${i + 1} of ${count} ---`);
        try {
            await runAgentCycle();
            console.log(`Story ${i + 1} completed successfully.`);
        } catch (error) {
            console.error(`Story ${i + 1} failed.`, error);
            // Continue to next story even if one fails?
            // Let's continue but log error.
        }

        // Optional: Add delay if needed, but for now just run sequentially
        if (i < count - 1) {
            console.log("Waiting 2 seconds before next story...");
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }
    }

    console.log("\nAll requested cycles completed.");
}

main();
