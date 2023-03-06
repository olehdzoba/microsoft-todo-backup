import fs from "fs";
import path from "path";

import cron from "node-cron";
import inquirer from "inquirer";

import { notifyClient } from "./notify.js";

const LOCK_FILE = ".data/config-lock.json";
const ABORT_TIMEOUT = 5 * 60000;

export function initializeFromEnvironment() {
  createDefaultDirectories();
  const backupParams = {
    backupDirectory: process.env.BACKUP_DIRECTORY,
    backupRepeatPattern: process.env.BACKUP_REPEAT_PATTERN || null,
    microsoftUsername: process.env.MICROSOFT_USERNAME,
    microsoftPassword: process.env.MICROSOFT_PASSWORD,
    notificationsConfirmed: process.env.NOTIFICATIONS_CONFIRMED == "true",
    pushbulletToken: process.env.PUSHBULLET_TOKEN,
    pushbulletDeviceIden: process.env.PUSHBULLET_DEVICE_IDEN,
  };

  saveLockParams(backupParams);
  return backupParams;
}

export async function initializeBackup() {
  createDefaultDirectories();

  const backupParams = await Promise.race([
    createPromptPromise(),
    createTimeoutPromise(ABORT_TIMEOUT),
  ]).then(handleAnswers, handleTimeout);

  saveLockParams(backupParams);

  return backupParams;
}

function createDefaultDirectories() {
  if (!fs.existsSync(".data/")) fs.mkdirSync(".data");
  if (!fs.existsSync("logs/")) fs.mkdirSync("logs");
}

function saveLockParams(backupParams) {
  fs.writeFileSync(
    LOCK_FILE,
    JSON.stringify({
      pushbulletToken: backupParams.pushbulletToken,
      pushbulletDeviceIden: backupParams.pushbulletDeviceIden,
    })
  );
}

function handleAnswers(answers) {
  answers.backupDirectory = path.resolve(answers.backupDirectory);
  if (!fs.existsSync(answers.backupDirectory)) {
    fs.mkdirSync(answers.backupDirectory, { recursive: true });
  }

  if (answers.customRepeatPattern) {
    answers.backupRepeatPattern = answers.customRepeatPattern;
    delete answers.backupRepeat;
    delete answers.customRepeatPattern;
  } else {
    answers.backupRepeatPattern = {
      Daily: "0 0 * * *",
      Weekly: "0 0 * * 1",
      Monthly: "0 0 1 * *",
      Never: null,
    }[answers.backupRepeat];
    delete answers.backupRepeat;
  }

  return answers;
}

async function handleTimeout() {
  if (fs.existsSync(LOCK_FILE)) {
    const pushbulletParams = JSON.parse(fs.readFileSync(LOCK_FILE));
    if (pushbulletParams.pushbulletToken && pushbulletParams.pushbulletDeviceIden) {
      await notifyClient(
        "MSTD Backup Alert!",
        "Interactive mode failed to start!",
        pushbulletParams
      );
    }
  }

  return null;
}

function createPromptPromise() {
  return inquirer.prompt([
    {
      type: "input",
      name: "backupDirectory",
      message: "Enter the backup directory",
      default: "backup",
      validate: (input) => input.length > 0,
    },
    {
      type: "list",
      name: "backupRepeat",
      message: "Choose an option for to repeat backup from list below",
      choices: ["Daily", "Weekly", "Monthly", "Custom", "Never"],
      default: "Daily",
      loop: true,
    },
    {
      type: "input",
      name: "customRepeatPattern",
      message: "Specify custom pattern for a cron job to repeat the backup",
      when: (answers) => answers.backupRepeat == "Custom",
      validate: (input) => cron.validate(input),
    },
    {
      type: "input",
      name: "microsoftUsername",
      message: "Enter your Microsoft username",
      validate: (input) => input.length > 0,
    },
    {
      type: "password",
      mask: "*",
      name: "microsoftPassword",
      message: "Enter your Microsoft password",
      validate: (input) => input.length > 0,
    },
    {
      type: "confirm",
      name: "notificationsConfirmed",
      message: "Do you want to recieve notifications?",
      default: true,
    },
    {
      type: "password",
      mask: "*",
      name: "pushbulletToken",

      message: "Enter your Pushbullet token",
      when: (answers) => answers.notificationsConfirmed,
      validate: (input) => input.length > 0,
    },
    {
      type: "password",
      mask: "*",
      name: "pushbulletDeviceIden",
      message: "Enter your Pushbullet device identification (`iden`)",
      when: (answers) => answers.notificationsConfirmed,
      validate: (input) => input.length > 0,
    },
    // {
    //   type: "confirm",
    //   name: "generateReports",
    //   message: "Do you want to generate and recieve reports?",
    //   default: true,
    //   when: (answers) => answers.notificationsConfirmed,
    // },
  ]);
}

function createTimeoutPromise(ms) {
  return new Promise((_, reject) => setTimeout(reject, ms));
}
