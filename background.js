import cron from "node-cron";
import fs from "fs";
// import { executeBackup } from "./lib/backup";

if (process.argv.includes("--report")) {
  // TODO: implement
}

process.on("message", (backupParams) => {
  fs.writeFileSync("test.json", JSON.stringify(backupParams));
  // cron.schedule(backupParams.backupRepeat, () => executeBackup(backupParams));
});

process.send("launch");
