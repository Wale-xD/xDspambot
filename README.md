# WalexD Spam Bot

A multi-purpose Discord bot with spam, and troll commands. Built with Discord.js v14 and Firebase for persistent owner/user management.

## Setup

### 1. Clone the repo
```
git clone https://github.com/YOUR_USERNAME/WalexD-Spam
cd WalexD-Spam
npm install
```

### 2. Create a `.env` file
Create a file called `.env` in the root folder with the following:

```
TOKEN=your_bot_token_here
CLIENT_ID=your_bot_client_id_here


FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
```

### 3. Register slash commands
```
node deploy-commands.js
```

### 4. Start the bot
```
node index.js
```

---

## Slash Commands

| Command | Description |
|---|---|
| `/spamraid` | Spam a message multiple times |
| `/embedspam` | Spam embed messages |
| `/stopspam` | Stop any running spam |
| `/purge` | Delete messages in a channel |
| `/ban` | Send a fake ban message |
| `/nitro` | Send a fake Discord Nitro gift |
| `/blame` | Send a fake raid alert blaming a user |
| `/fakeip` | Show a fake IP lookup for a user |
| `/ghostping` | Ghost ping a user (deleted instantly) |
| `/ping` | Check bot latency |

---

## Prefix Commands (default prefix: `^`)

| Command | Description |
|---|---|
| `^setprefix` | Change the bot prefix |
| `^setstatus` | Set the bot status |
| `^removestatus` | Remove the bot status |
| `^addowner` | Add a bot owner |
| `^removeowner` | Remove a bot owner |
| `^ownerslist` | List all owners |
| `^approveuser` | Approve a user to use the bot |
| `^removeuser` | Remove an approved user |
| `^approvedlist` | List all approved users |
| `^serverlist` | List all servers the bot is in |

JOIN WEBHOOK:
Go to your repo → Settings → Secrets and variables → Actions → add a secret called DISCORD_WEBHOOK with your webhook URL
----------------
This Will Send A Notification Through That Webhook Everytime You Push Or Commit Changes To The Repo

---

## Hosting on Render.com

1. Push your code to GitHub (without `.env`)
2. Create a new **Web Service** on Render
3. Connect your GitHub repo
4. Add all `.env` variables in the **Environment** tab
5. Set start command to `node index.js`
6. Add a free monitor on **UptimeRobot** pointing to your Render URL to keep the bot alive 24/7
