import fs from "fs";
import path from "path";
import dotenv from "dotenv";

import cron from "node-cron";
import initPrompt from "prompt-sync";
import passwordPrompt from "password-prompt";
import cliSelect from "cli-select";

dotenv.config();

const regularPrompt = initPrompt();

export function loadEnvironmentParams() {
  return {
    backupDirectory: process.env.BACKUP_DIRECTORY,
    backupRepeat: process.env.BACKUP_REPEAT,
    microsoftUsername: process.env.MICROSOFT_USERNAME,
    microsoftPassword: process.env.MICROSOFT_PASSWORD,
    pushbulletToken: process.env.PUSHBULLET_TOKEN,
    pushbulletDeviceIden: process.env.PUSHBULLET_DEVICE_IDEN,
  };
}

export async function initializeBackup() {
  createDefaultDirectories();

  const backupDirectory = promptBackupDirectory();

  const backupRepeat = await promptBackupRepeat();

  const { microsoftUsername, microsoftPassword } = await promptCredentials();

  const { pushbulletToken, pushbulletDeviceIden } = await promptPushbulletParams();

  saveLockData({ backupDirectory, backupRepeat, pushbulletToken, pushbulletDeviceIden });

  return {
    backupDirectory,
    backupRepeat,
    microsoftUsername,
    microsoftPassword,
    pushbulletToken,
    pushbulletDeviceIden,
  };
}

function createDefaultDirectories() {
  if (!fs.existsSync(".data/")) fs.mkdirSync(".data");
  if (!fs.existsSync("logs/")) fs.mkdirSync("logs");
}

function promptBackupDirectory() {
  let backupDirectory;
  let validBackupDirectory = false;

  while (!validBackupDirectory) {
    backupDirectory = path.resolve(
      regularPrompt("Where do you want to save your backups (enter path to empty directory): ")
    );

    if (!fs.existsSync(backupDirectory)) {
      const isCreating = regularPrompt("Directory does not exist. Create it (Y/n): ");
      if (!isCreating || isCreating == "Y") {
        fs.mkdirSync(backupDirectory, { recursive: true });
      } else {
        continue;
      }
    }

    validBackupDirectory = true;
  }

  return backupDirectory;
}

function promptBackupRepeat() {
  return new Promise((resolve) => {
    console.log("How often do you want to repeat backup?");
    cliSelect({ values: ["Hourly", "Daily", "Weekly", "Custom", "Never"] }, ({ value }) => {
      if (value == "Custom") {
        let pattern = "";
        while (!cron.validate(pattern)) {
          pattern = regularPrompt("Enter custom cron pattern for backup repeat: ");
        }
        resolve(pattern);
      } else {
        resolve(
          {
            Hourly: "0 * * * *",
            Daily: "0 0 * * *",
            Weekly: "0 0 1 * *",
            Never: null,
          }[value]
        );
      }
    });
  });
}

async function promptCredentials() {
  const microsoftUsername = regularPrompt("What is your Microsoft username (required): ");
  if (!microsoftUsername) throw new Error("Microsoft username is required!");

  const microsoftPassword = await passwordPrompt("What is your Microsoft password (required): ");
  if (!microsoftPassword) throw new Error("Microsoft password is required!");

  return { microsoftUsername, microsoftPassword };
}

async function promptPushbulletParams() {
  const pushbulletToken = await passwordPrompt(
    "What is your Pushbullet token (leave blank to disable notifications):"
  );

  let pushbulletDeviceIden = null;
  if (pushbulletToken.trim().length > 0) {
    pushbulletDeviceIden = await passwordPrompt("What is your Pushbullet `iden` (required):");
    if (!pushbulletDeviceIden)
      throw new Error("Pushbullet `iden` is required if you pass Pushbullet token!");
  }

  return { pushbulletToken, pushbulletDeviceIden };
}

function saveLockData(lockData) {
  return fs.writeFileSync(".data/config-lock.json", JSON.stringify(lockData));
}