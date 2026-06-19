import { executeLocalTool } from "./packages/cli/src/lib/local-tools";
import { Mode } from "./packages/shared/src/schemas";

async function main() {
    const query = "React 19 release date features";
    console.log(`Running search for: "${query}"...\n`);

    try {
        const result = await executeLocalTool("webSearch", { query, maxResults: 3 }, Mode.PLAN);
        console.log("--- Result ---");
        console.log(result);
        console.log("--------------");
    } catch (error) {
        console.error("Execution failed:", error);
    }
}

main();
