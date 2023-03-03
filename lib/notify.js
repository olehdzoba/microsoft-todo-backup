import fs from "fs";
import axios from "axios";

export function notifyClient(title, body, { pushbulletToken, pushbulletDeviceIden }) {
  return axios.post(
    "https://api.pushbullet.com/v2/pushes",
    {
      type: "note",
      title,
      body,
      deveci_iden: pushbulletDeviceIden,
    },
    {
      headers: {
        "Access-Token": pushbulletToken,
      },
    }
  );
}

export async function notifyAboutWaiting() {
  if (fs.existsSync(".data/config-lock.json")) {
    const { pushbulletToken, pushbulletDeviceIden } = JSON.parse(
      fs.readFileSync(".data/config-lock.json")
    );

    await notifyClient(
      "MSTD Backup Alert!",
      "Backup is initializaing in interactive mode: waiting for you!",
      { pushbulletToken, pushbulletDeviceIden }
    );
  }
}
