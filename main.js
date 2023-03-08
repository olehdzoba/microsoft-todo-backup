import dotenv from "dotenv";
dotenv.config();

import subprocess from "child_process";
import fs from "fs";
//console.log(fs);
import { program } from "commander";
import { initializeBackup, initializeFromEnvironment } from "./lib/initialize.js";
import { executeBackup } from "./lib/backup.js";

main();

async function main() {
  program
    .name("Microsoft To-Do Backup Tool")
    .description("Makes regular backup of your lists and tasks in Microsoft To-Do")
    .version("0.1.0");

  program.option("--non-interactive", "load parameters from environment instead of prompts");

  program.parse();
  const { nonInteractive } = program.opts();

  const backupParams = nonInteractive ? initializeFromEnvironment() : await initializeBackup();
  if (backupParams === null) return;

  if (backupParams.backupRepeatPattern == null) {
    await executeBackup(backupParams);
  } else {
    const args = backupParams.generateReports ? ["--report"] : [];
    const service = subprocess.fork("background.js", args, { detached: true });

    service.on("message", () => {
      // service was launched
      service.send(backupParams);
      console.log("Cronjob was set up successfully!");
      process.exit();
    });

    service.unref();
  }
}
