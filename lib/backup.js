import fs from "fs";
import moment from "moment";
import { exportMircrosoftTodos } from "./export.js";
import { getAccessToken } from "./token.js";
import { notifyClient } from "./notify.js";

export async function executeBackup(params) {
  const {
    backupDirectory,
    microsoftUsername,
    microsoftPassword,
    notificationsConfirmed,
    pushbulletToken,
    pushbulletDeviceIden,
  } = params;

  try {
    const microsoftToken = await getAccessToken(microsoftUsername, microsoftPassword);
    const actualBackupData = await exportMircrosoftTodos(microsoftToken);

    const backupFilename = moment().format("YYYY-MM-DD[T]HH-mm") + ".json";
    fs.writeFileSync(backupDirectory + "/" + backupFilename, JSON.stringify(actualBackupData), {
      encoding: "utf-8",
    });
  } catch (error) {
    if (notificationsConfirmed)
      await notifyClient("MSTD Backup Alert!", error.message, {
        pushbulletToken,
        pushbulletDeviceIden,
      });
  }
}
