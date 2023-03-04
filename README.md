# Microsoft To-Do Backup

This tool makes a complete backup of Microsoft To Do. Every list and task is backed up and saved as JSON files.

## Installation

To use this software you need to have NodeJS and NPM installed.
After you have both of them installed you need to run the following commands.

Clone the repository to your machine:

```sh
git clone https://github.com/olehdzoba/microsoft-todo-backup
```

Go into the local repository:

```sh
cd microsoft-todo-backup/
```

---

> **For Linux (Ubuntu) users:** This tool uses Puppeteer under the hood so, if you installing Puppeteer for the first time on your machine, then run the following commands to install external dependencies:

```sh
# Update repositories
sudo apt update

# Install dependencies
sudo apt install -y gconf-service libgbm-dev libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget
```

---

Install node modules:

```sh
npm install
```

> If you ran into some problems during installation, refer to the installation of Puppeteer for your operating system. Most problems related to installation are caused by Puppeteer.

## Usage

To use this tool you first need to fulfill prerequisites section below. Then you need to decide on approach which you want to use.

### Prerequisites

#### Microsoft account configuration

You will need to give specific persmissions to use Microsoft Graph API responsible for Microsoft To-Do.

To do that, follow the steps below:

1. Go to the [graph explorer](https://developer.microsoft.com/en-us/graph/graph-explorer)
2. Sign in into your Microsoft account
3. Click on your account icon and then on the link to give consent to permissions
4. In the permissions panel, grant permissions for `Tasks.Read`

#### Pushbullet API

If you want to recieve notifications about any errors in your backup you should provide an API token to Pushbullet services.
Create a free account and retrieve the API token in your settings. After you have it done, you can go on to the next section.

### Recommended approach

This is the default and recommended approach. If you use this approach, the program will show you several prompts and automatically create configuration and the cronjob.

To start interactively, run the command in the repository directory and follow the instructions.

```sh
npm start
```

### From environment

Although, if you prefer programatic (non-interactive) approach, then you need to create a file called `.env` in the root directory and fill it with the parameters shown in `.env.sample`:

```toml
BACKUP_DIRECTORY="backup" # or any other directory where you want to store your backup

# It is not recommended to specify BACKUP_REPEAT_PATTERN
# You can always specify recurrency of this backup using default cron utility
# Keywords like: Hourly, Daily, Never - are not supported here

# BACKUP_REPEAT_PATTERN="0 * * * *"

MICROSOFT_USERNAME="<your username>"
MICROSOFT_PASSWORD="<your password>"
NOTIFICATIONS_CONFIRMED="true" # any other value treated as false

# These will be saved to the lock file when you run the program
PUSHBULLET_TOKEN="<your token>"
PUSHBULLET_DEVICE_IDEN="<your iden>"
```

After you create this file, you can use the following command to start the application:

```sh
node main.js --non-interactive
```

## Known issues with `@hotmail.com`

While I was developing this applicatoin, I tried to use my `hotmail` account to access Microsoft Graph API at the first place. However, the attempt was unsuccessfull...

For some reason, when I tried to access lists using MS Graph API with `hotmail` account, it was giving me only the `Flagged Emails` list and nothing more. Fetching lists is essential for this application to work, so I had to migrate my lists and tasks to `gmail` account.

Fortunetuly, it is relatively easy to do. You can share the lists on in the mobile app of Microsoft To Do and save them to your notes in plain text. Then you can just paste this text backup to the new account and it will create the tasks.

## Enhancements

Here is a list of potential impovements. If feel like helping this project, you can work on one these and send me a PR.

- [ ] To add logging
- [ ] To add reporting
- [ ] To add backup compression
- [ ] To add backup import
- [ ] To add backup encryption
- [ ] To test properly

## Contributing

If you encountered any bugs or you have propals, then read [the contributing guidelines](./CONTRIBUTING.md). Please, first open an issue, before submitting any pull requests.
