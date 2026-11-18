# Telegram Clone

A real-time messaging web app inspired by Telegram.

**Features:** sign up / log in (JWT + bcrypt), one-to-one chats, a shared General group, live online status, typing indicator, unread badges, chat search, persistent message history, light/dark theme, mobile-friendly layout.

**Tech stack:** Node.js, Express, Socket.IO (WebSockets), JSON file storage, vanilla HTML/CSS/JS.

## Run
1. Install Node.js 18+ from https://nodejs.org
2. In this folder run:
   ```
   npm install
   npm start
   ```
3. Open http://localhost:3000. To test chatting, open a second browser or an incognito window and create another account.

## Structure
```
server.js          API, authentication, Socket.IO events, storage
public/index.html  Complete chat interface
data.json          Created automatically (users + messages)
```
