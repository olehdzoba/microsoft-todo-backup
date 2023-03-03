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
