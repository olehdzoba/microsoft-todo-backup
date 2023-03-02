import axios from "axios";
import { logger } from "./logger.js";

const BASE_URI = "https://graph.microsoft.com/v1.0";

class AuthorizationError extends Error {}

function createHeaders(accessToken) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
}

async function checkAuthorized(accessToken) {
  const headers = createHeaders(accessToken);
  const response = await axios.get(BASE_URI + "/me", { headers });
  if (response.status == 401) {
    return false;
  }
  return true;
}

async function getTodosList(accessToken) {
  const headers = createHeaders(accessToken);
  const response = await axios.get(BASE_URI + "/me/todo/lists", { headers });
  if (response.status == 200) {
    return response.data.value;
  }
  return null;
}

async function getListTasks(accessToken, list) {
  const headers = createHeaders(accessToken);
  let uri = `${BASE_URI}/me/todo/lists/${list.id}/tasks`;

  const tasks = [];
  while (uri) {
    const response = await axios.get(uri, { headers });
    for (const task of response.data.value || []) {
      delete task["@odata.etag"];
      tasks.push(task);
    }
    uri = response.data["@odata.nextLink"];
  }
  return tasks;
}

export async function exportMircrosoftTodos(microsoftToken) {
  const isAuthorized = await checkAuthorized(microsoftToken);
  if (!isAuthorized) throw new AuthorizationError();

  const lists = await getTodosList(microsoftToken);
  if (!lists) throw new Error("Unexpected behavior: failed to load lists!");

  const tasks = [];
  for (const list of lists) {
    delete list["@odata.etag"];

    const listTasks = await getListTasks(microsoftToken, list);
    tasks.push({
      listId: list.id,
      listTasks,
    });
  }

  return { lists, tasks };
}
