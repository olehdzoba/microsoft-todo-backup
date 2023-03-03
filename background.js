import cron from "node-cron";
import fs from "fs";
import { executeBackup } from "./lib/backup.js";

if (process.argv.includes("--report")) {
  // TODO: implement
}

process.on("message", (backupParams) => {
  cron.schedule(backupParams.backupRepeatPattern, () => executeBackup(backupParams));
});

process.send("launch");
