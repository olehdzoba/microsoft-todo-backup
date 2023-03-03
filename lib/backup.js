import { exportMircrosoftTodos } from "./export.js";
import { getAccessToken } from "./token.js";

export async function executeBackup(params) {
  const {
    backupDirectory,
    microsoftUsername,
    microsoftPassword,
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
    if (pushbulletToken)
      await notifyClient("MSTD Backup Alert!", error.message, {
        pushbulletToken,
        pushbulletDeviceIden,
      });
  }
}
