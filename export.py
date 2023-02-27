import requests
import json
from datetime import datetime
import logging
import os
import subprocess
from dotenv import load_dotenv

load_dotenv()

ms_login = os.getenv("MS_LOGIN")
ms_password = os.getenv("MS_PASSWORD")
gotify_token = os.getenv("GOTIFY_TOKEN")
gotify_url = os.getenv("GOTIFY_URL")

crawl_process = subprocess.run(
    f"node scripts/get-token/index.js {ms_login} {ms_password}", capture_output=True
)

todos_token = crawl_process.stdout.decode("utf8").strip()

logger_format = "%(asctime)s %(name)s %(levelname)s %(message)s"
logger_datefmt = "%Y-%m-%d %H:%M:%S"

logging.basicConfig(
    filename="logs/debug.log",
    filemode="a",
    encoding="utf8",
    format=logger_format,
    datefmt=logger_datefmt,
    level=logging.DEBUG,
)

logger = logging.getLogger("logger")
logger_formatter = logging.Formatter(logger_format, logger_datefmt)

info_handler = logging.FileHandler("logs/info.log", encoding="utf8")
info_handler.setLevel(logging.INFO)

warning_handler = logging.FileHandler("logs/warning.log", encoding="utf8")
warning_handler.setLevel(logging.WARNING)

error_handler = logging.FileHandler("logs/error.log", encoding="utf8")
error_handler.setLevel(logging.ERROR)

info_handler.setFormatter(logger_formatter)
warning_handler.setFormatter(logger_formatter)
error_handler.setFormatter(logger_formatter)

logger.addHandler(info_handler)
logger.addHandler(warning_handler)
logger.addHandler(error_handler)


def call_help(message):
    requests.post(
        f"{gotify_url}/message?token={gotify_token}",
        json={
            "title": "Todos Backup - Help required!",
            "message": message,
            "priority": 10,
        },
    )


def export_microsoft_todo(export_filename):
    logger.info("Started to export...")

    base_uri = "https://graph.microsoft.com/v1.0"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {todos_token}",
    }

    response = requests.get(f"{base_uri}/me", headers=headers)
    if response.status_code == 401:
        logger.error("Unauthorized:")
        logger.error("\n" + json.dumps(response.json(), indent=2) + "\n")
        call_help("Authorization failed! Take a look at the logs!")
        return False

    myself = response.json()

    logger.info(f"User: {myself['displayName']} / {myself['userPrincipalName']}")
    logger.info(f"Output file: {export_filename}")

    response = requests.get(f"{base_uri}/me/todo/lists", headers=headers)
    all_lists = response.json()["value"]

    logger.info(f"Got {len(all_lists)} lists from the user")

    all_tasks = []
    for list_item in all_lists:
        del list_item["@odata.etag"]

        logger.info(f"Getting tasks in list: {list_item['displayName']}...")
        resulting_tasks = []

        uri = f"{base_uri}/me/todo/lists/{list_item['id']}/tasks"
        while uri:
            response = requests.get(uri, headers=headers)
            list_page = response.json()
            list_tasks = list_page["value"]

            for task in list_tasks:
                del task["@odata.etag"]
                resulting_tasks.append(task)

            # have to use .get because sometimes @odata.nextLink can be None
            uri = list_page.get("@odata.nextLink")

        logger.info(f"Got {len(list_tasks)} tasks from {list_item['displayName']}")

        all_tasks.append({"list_id": list_item["id"], "list_tasks": resulting_tasks})

    total_tasks = sum(len(task["list_tasks"]) for task in all_tasks)
    logger.info(f"Total number of tasks: {total_tasks}")

    with open(export_filename, "w") as file:
        json.dump({"lists": all_lists, "tasks": all_tasks}, file)

    logger.info("Export complete.\n")

    return True


def main():
    timestamp = datetime.now().strftime("%Y-%m-%d--%H-%M")
    try:
        export_microsoft_todo(f"backup-data/backup--{timestamp}.json")
    except Exception as e:
        logger.error(str(e))
        call_help("Unexpected error happened! Take some action!")


if __name__ == "__main__":
    main()
