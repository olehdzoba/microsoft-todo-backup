import axios from "axios";

export function notifyClient(message, pushbulletToken, pushbulletDeviceIden) {
  return axios.post(
    "https://api.pushbullet.com/v2/pushes",
    {
      type: "note",
      title: "Microsoft Backup",
      body: message,
      deveci_iden: pushbulletDeviceIden,
    },
    {
      headers: {
        "Access-Token": pushbulletToken,
      },
    }
  );
}
