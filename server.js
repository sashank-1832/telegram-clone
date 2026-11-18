const express = require('express'), http = require('http'), { Server } = require('socket.io');
const bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken'), fs = require('fs'), path = require('path');

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const DB_FILE = path.join(__dirname, 'data.json');
let db = { users: [], messages: [] };
if (fs.existsSync(DB_FILE)) db = JSON.parse(fs.readFileSync(DB_FILE));
const save = () => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

const app = express(), server = http.createServer(app), io = new Server(server);
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const sign = (username) => jwt.sign({ username }, SECRET, { expiresIn: '7d' });

// ---------- Auth REST API ----------
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (!/^\w{3,20}$/.test(username || '') || (password || '').length < 4)
    return res.status(400).json({ error: 'Username: 3-20 letters/numbers. Password: at least 4 characters.' });
  if (db.users.find((u) => u.username === username))
    return res.status(409).json({ error: 'That username is already taken.' });
  db.users.push({ username, hash: await bcrypt.hash(password, 10) });
  save();
  res.json({ token: sign(username), username });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  const user = db.users.find((u) => u.username === username);
  if (!user || !(await bcrypt.compare(password || '', user.hash)))
    return res.status(401).json({ error: 'Wrong username or password.' });
  res.json({ token: sign(username), username });
});

// ---------- Real-time chat (Socket.IO) ----------
const online = new Map(); // username -> open connection count
const roomOf = (a, b) => (b === '#general' ? '#general' : [a, b].sort().join('|'));

io.use((socket, next) => {
  try { socket.user = jwt.verify(socket.handshake.auth.token, SECRET).username; next(); }
  catch { next(new Error('Unauthorized')); }
});

io.on('connection', (socket) => {
  const me = socket.user;
  socket.join('u:' + me);
  online.set(me, (online.get(me) || 0) + 1);
  const userList = () => db.users.map((u) => ({ username: u.username, online: online.has(u.username) }));
  io.emit('users', userList());

  socket.on('history', (peer, cb) =>
    cb(db.messages.filter((m) => m.room === roomOf(me, peer)).slice(-100)));

  socket.on('message', ({ to, text }) => {
    text = String(text || '').trim().slice(0, 2000);
    if (!text || !to) return;
    const msg = { id: Date.now() + Math.random(), room: roomOf(me, to), from: me, to, text, time: Date.now() };
    db.messages.push(msg); save();
    if (to === '#general') io.emit('message', msg);
    else io.to('u:' + to).to('u:' + me).emit('message', msg);
  });

  socket.on('typing', (to) => { if (to !== '#general') io.to('u:' + to).emit('typing', me); });

  socket.on('disconnect', () => {
    const left = (online.get(me) || 1) - 1;
    left ? online.set(me, left) : online.delete(me);
    io.emit('users', userList());
  });
});

server.listen(process.env.PORT || 3000, () => console.log('Telegram Clone running at http://localhost:3000'));
