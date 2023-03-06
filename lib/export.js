import axios from "axios";
import axiosRetry from "axios-retry";

const BASE_URI = "https://graph.microsoft.com/v1.0";

axiosRetry(axios, {
  retries: 3,
  retryDelay: (retryCount) => {
    console.log(`retry attempt: ${retryCount}`);
    return retryCount * 2000;
  },
  retryCondition: (error) => {
    return error.response.status === 503;
  },
});

export async function exportMircrosoftTodos(microsoftToken) {
  const isAuthorized = await checkAuthorized(microsoftToken);
  if (!isAuthorized) throw new Error("Unauthorized!");

  const lists = await getTodosLists(microsoftToken);
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

async function getTodosLists(accessToken) {
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
