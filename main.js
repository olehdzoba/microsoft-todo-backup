import subprocess from "child_process";
import { program } from "commander";
import { initializeBackup, loadEnvironmentParams } from "./lib/initialize.js";
import { notifyAboutWaiting } from "./lib/notify.js";
// import { executeBackup } from "./lib/backup.js";

main();

async function main() {
  program
    .name("Microsoft To-Do Backup Tool")
    .description("Makes regular backup of your lists and tasks in Microsoft To-Do")
    .version("0.1.0");

  program.option("-i, --interactive", "run in interactive mode with prompts");
  program.option("-r, --generate-reports", "send report about backups once a month");
  program.option(
    "-w, --wait-notification",
    "notifies you when backup is started and waits for your initialization"
  );

  program.parse();
  const { interactive, generateReports, waitNotification } = program.opts();

  if (interactive && waitNotification) await notifyAboutWaiting();

  console.log({ interactive, generateReports, waitNotification });

  const backupParams = interactive ? await initializeBackup() : loadEnvironmentParams();

  if (backupParams.backupRepeat == null) await executeBackup(backupParams);
  if (false) {
  } else {
    const args = generateReports ? ["--report"] : [];
    const service = subprocess.fork("background.js", args, { detached: true });

    service.on("message", () => {
      // service was launched
      service.send(backupParams);
      process.exit();
    });

    service.unref();
  }
}
