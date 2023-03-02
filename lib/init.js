import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import initPrompt from "prompt-sync";
import passwordPrompt from "password-prompt";
import cliSelect from "cli-select";

dotenv.config();

const regularPrompt = initPrompt();

function selectOption(question, values) {
  return new Promise((resolve) => {
    console.log(question);
    cliSelect({ values }, ({ value }) => resolve(value));
  });
}

export async function initializeBackup(nonInteractive = false) {
  if (nonInteractive) {
    return {
      backupDirectory: process.env.BACKUP_DIRECTORY,
      backupRepeat: process.env.BACKUP_REPEAT,
      microsoftUsername: process.env.MICROSOFT_USERNAME,
      microsoftPassword: process.env.MICROSOFT_PASSWORD,
      pushbulletToken: process.env.PUSHBULLET_TOKEN,
      pushbulletDeviceIden: process.env.PUSHBULLET_DEVICE_IDEN,
    };
  }

  if (!fs.existsSync(".data/")) fs.mkdirSync(".data");

  if (!fs.existsSync("logs/")) fs.mkdirSync("logs");

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

  const backupRepeat = await selectOption("How often do you want to repeat backup?", [
    "Hourly",
    "Daily",
    "Weekly",
    "Never",
  ]);

  const microsoftUsername = regularPrompt("What is your Microsoft username (required): ");
  if (!microsoftUsername) throw new Error("Microsoft username is required!");

  const microsoftPassword = await passwordPrompt("What is your Microsoft password (required): ");
  if (!microsoftPassword) throw new Error("Microsoft password is required!");

  const pushbulletToken = await passwordPrompt(
    "What is your Pushbullet token (leave blank to disable notifications):"
  );

  let pushbulletDeviceIden = null;
  if (pushbulletToken.trim().length > 0) {
    pushbulletDeviceIden = await passwordPrompt("What is your Pushbullet `iden` (required):");
    if (!pushbulletDeviceIden)
      throw new Error("Pushbullet `iden` is required if you pass Pushbullet token!");
  }

  fs.writeFileSync(
    ".data/config-lock.json",
    JSON.stringify({
      backupDirectory,
      backupRepeat,
      pushbulletToken,
      pushbulletDeviceIden,
    })
  );

  return {
    backupDirectory,
    backupRepeat,
    microsoftUsername,
    microsoftPassword,
    pushbulletToken,
    pushbulletDeviceIden,
  };
}
