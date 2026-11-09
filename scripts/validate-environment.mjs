import { environmentReport } from "../src/lib/launch/environment.ts";
import fs from "node:fs";
if (fs.existsSync(".env.local")) process.loadEnvFile(".env.local");
const report = environmentReport();
console.log(
  JSON.stringify({
    stage: report.stage,
    errors: report.errors,
    warnings: report.warnings,
    indexing: report.indexing,
  }),
);
if (report.errors.length) process.exitCode = 1;
