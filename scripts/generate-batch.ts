import { runBatchAgent } from "../src/agent/batch";

async function main() {
    try {
        const output = await runBatchAgent();
        console.log(JSON.stringify(output, null, 2));
    } catch (error) {
        console.error("Error running batch agent:", error);
        process.exit(1);
    }
}

main();
