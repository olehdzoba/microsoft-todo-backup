import fs from "fs";
import moment from "moment";
import { exportMircrosoftTodos } from "./lib/export.js";
import { initializeBackup } from "./lib/init.js";
import { notifyClient } from "./lib/notify.js";
import { getAccessToken } from "./lib/token.js";
import cron from "node-cron";
import { program } from "commander";

main();

function convertRepeatToCron(pattern) {
  return {
    Hourly: "0 * * * *",
    Daily: "0 0 * * *",
    Weekly: "0 0 1 * *",
    Never: null,
  }[pattern];
}

function formatFilename() {
  return `${moment().format("YYYY-MM-DD[T]HH-mm")}.json`;
}

async function executeBackup(
  backupDirectory,
  microsoftUsername,
  microsoftPassword,
  pushbulletToken,
  pushbulletDeviceIden
) {
  try {
    const microsoftToken = await getAccessToken(microsoftUsername, microsoftPassword);
    const actualBackupData = await exportMircrosoftTodos(microsoftToken);

    fs.writeFileSync(backupDirectory + "/" + formatFilename(), JSON.stringify(actualBackupData), {
      encoding: "utf-8",
    });
  } catch (error) {
    if (pushbulletToken) await notifyClient(error.message, pushbulletToken, pushbulletDeviceIden);
  }
}

async function main() {
  program.option("--non-interactive");
  program.parse();

  const { nonInteractive } = program.opts();

  if (fs.existsSync(".data/config-lock.json")) {
    let { backupDirectory, backupRepeat, pushbulletToken, pushbulletDeviceIden } = JSON.parse(
      fs.readFileSync(".data/config-lock.json")
    );

    if (!nonInteractive)
      await notifyClient(
        "Backup is initializaing in interactive mode: waiting for you!",
        pushbulletToken,
        pushbulletDeviceIden
      );
  }

  const {
    backupDirectory,
    backupRepeat,
    microsoftUsername,
    microsoftPassword,
    pushbulletToken,
    pushbulletDeviceIden,
  } = await initializeBackup(nonInteractive);

  const cronPattern = convertRepeatToCron(backupRepeat);
  if (cronPattern === null) {
    await executeBackup(
      backupDirectory,
      microsoftUsername,
      microsoftPassword,
      pushbulletToken,
      pushbulletDeviceIden
    );
    return;
  }

  if (typeof cronPattern == "undefined" || !cron.validate(cronPattern))
    throw new Error("Invalid repeat recurrency of the backup!");

  cron.schedule(cronPattern, () =>
    executeBackup(
      backupDirectory,
      microsoftUsername,
      microsoftPassword,
      pushbulletToken,
      pushbulletDeviceIden
    )
  );
}
