const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

// Fixed list of players
const players = ["Alina", "Alex", "Ollie", "Bob", "Gus", "DanO", "DanE", "Vicky", "Grace", "Lottie"];

// In-memory storage for game data
let assignments = {};       // { name: role }
let gameStarted = false;
let traitorChat = [];       // Array of chat messages (strings)
let murderVictim = null;    // Name of the murdered player

app.use(bodyParser.urlencoded({ extended: false }));

// Shared CSS styling for murder mystery theme
const themeCSS = `
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Georgia', 'Palatino', serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      color: #e8e8e8;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
      font-size: 18px;
    }
    .container {
      background: rgba(0, 0, 0, 0.7);
      border: 2px solid #c41e3a;
      border-radius: 15px;
      padding: 40px;
      max-width: 600px;
      width: 100%;
      box-shadow: 0 10px 40px rgba(196, 30, 58, 0.3);
    }
    h1, h2 {
      color: #ff4757;
      text-align: center;
      margin-bottom: 25px;
      font-size: 32px;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
      letter-spacing: 2px;
    }
    h1 {
      font-size: 38px;
    }
    p {
      text-align: center;
      margin-bottom: 20px;
      font-size: 18px;
    }
    ul {
      list-style: none;
      margin: 20px 0;
      padding: 0;
    }
    li {
      background: rgba(255, 255, 255, 0.05);
      margin: 10px 0;
      padding: 12px;
      border-left: 3px solid #c41e3a;
      font-size: 18px;
      border-radius: 5px;
    }
    a {
      color: #ff6b81;
      text-decoration: none;
      font-weight: bold;
      transition: color 0.3s;
    }
    a:hover {
      color: #ff4757;
      text-decoration: underline;
    }
    form {
      margin-top: 25px;
    }
    label {
      display: block;
      margin-bottom: 8px;
      color: #ffa502;
      font-weight: bold;
      font-size: 18px;
    }
    input[type="text"], select {
      width: 100%;
      padding: 12px;
      margin-bottom: 20px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid #c41e3a;
      border-radius: 5px;
      color: #e8e8e8;
      font-size: 16px;
      font-family: 'Georgia', 'Palatino', serif;
    }
    input[type="text"]:focus, select:focus {
      outline: none;
      border-color: #ff4757;
      background: rgba(255, 255, 255, 0.15);
    }
    select option {
      background: #16213e;
      color: #e8e8e8;
    }
    button {
      width: 100%;
      padding: 15px;
      background: linear-gradient(135deg, #c41e3a 0%, #8b0000 100%);
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 18px;
      font-weight: bold;
      font-family: 'Georgia', 'Palatino', serif;
      letter-spacing: 1px;
      transition: all 0.3s;
      box-shadow: 0 4px 15px rgba(196, 30, 58, 0.4);
    }
    button:hover {
      background: linear-gradient(135deg, #ff4757 0%, #c41e3a 100%);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(196, 30, 58, 0.6);
    }
    .chat-box {
      border: 1px solid #c41e3a;
      padding: 15px;
      height: 250px;
      overflow: auto;
      background: rgba(0, 0, 0, 0.5);
      border-radius: 5px;
      margin-bottom: 20px;
      font-size: 16px;
    }
    .message-form {
      margin-top: 15px;
    }
  </style>
`;

// ---------------- Home Route ----------------
app.get('/', (req, res) => {
  res.send(`
    ${themeCSS}
    <div class="container">
      <h1>🔪 Welcome to the Traitor Game 🔪</h1>
      <p>Choose your path wisely...</p>
      <ul>
        <li><a href="/admin">🎭 Admin Panel</a></li>
        <li><a href="/player">👤 Player Login</a></li>
        <li><a href="/traitor-login">💀 Traitor Login</a></li>
        <li><a href="/murder">🗡️ Murder Selection</a></li>
      </ul>
    </div>
  `);
});

// ---------------- Admin Routes ----------------

// GET /admin: Admin panel to display fixed players and a button to generate roles
app.get('/admin', (req, res) => {
  res.send(`
    ${themeCSS}
    <div class="container">
      <h2>🎭 Admin Panel 🎭</h2>
      <p>The players are preset:</p>
      <ul>
        ${players.map(name => `<li>${name}</li>`).join('')}
      </ul>
      <form method="POST" action="/admin">
        <button type="submit">Generate Roles</button>
      </form>
    </div>
  `);
});

// POST /admin: Generate roles for the fixed players
app.post('/admin', (req, res) => {
  if (gameStarted) {
    return res.send(`
      ${themeCSS}
      <div class="container">
        <h2>⚠️ Game Already Started ⚠️</h2>
        <p>Refresh to reset.</p>
      </div>
    `);
  }
  
  // Create a copy of the players array and shuffle it
  let names = [...players].sort(() => Math.random() - 0.5);
  
  // Allocate roles: first 2 are traitors, rest are faithful
  assignments = {};
  names.forEach((name, index) => {
    assignments[name.toLowerCase()] = (index < 2) ? 'Traitor' : 'Faithful';
  });
  
  gameStarted = true;
  
  res.send(`
    ${themeCSS}
    <div class="container">
      <h2>✅ Success! ✅</h2>
      <p>Roles generated successfully!</p>
      <p>Players can now check their roles at <a href="/player">/player</a>.</p>
    </div>
  `);
});

// ---------------- Player Routes ----------------

// GET /player: Player login page to check role
app.get('/player', (req, res) => {
  res.send(`
    ${themeCSS}
    <div class="container">
      <h2>👤 Player Login 👤</h2>
      <form method="POST" action="/player">
        <label>Enter your name:</label>
        <input type="text" name="playerName" required>
        <button type="submit">See My Role</button>
      </form>
    </div>
  `);
});

// POST /player: Display the player's role
app.post('/player', (req, res) => {
  const name = req.body.playerName.trim().toLowerCase();
  const role = assignments[name];
  
  if (!role) {
    return res.send(`
      ${themeCSS}
      <div class="container">
        <h2>❌ Error ❌</h2>
        <p>Name not found or game not started. Check your name!</p>
        <p><a href="/player">← Go Back</a></p>
      </div>
    `);
  }
  
  const roleEmoji = role === 'Traitor' ? '💀' : '✝️';
  const roleColor = role === 'Traitor' ? '#ff4757' : '#5fb3f6';
  
  res.send(`
    ${themeCSS}
    <div class="container">
      <h2 style="color: ${roleColor};">${roleEmoji} Your Role ${roleEmoji}</h2>
      <p style="font-size: 28px; color: ${roleColor}; font-weight: bold;">${role}</p>
      <p><a href="/">← Return Home</a></p>
    </div>
  `);
});

// ---------------- Traitor Login & Chat Routes ----------------

// GET /traitor-login: Login page for traitors
app.get('/traitor-login', (req, res) => {
  res.send(`
    ${themeCSS}
    <div class="container">
      <h2>💀 Traitor Login 💀</h2>
      <form method="POST" action="/traitor-login">
        <label>Select your name:</label>
        <select name="name" required>
          <option value="">-- Select a player --</option>
          ${players.map(name => `<option value="${name}">${name}</option>`).join('')}
        </select>
        <button type="submit">Login</button>
      </form>
    </div>
  `);
});

// POST /traitor-login: Check if the user is a traitor and redirect
app.post('/traitor-login', (req, res) => {
  const name = req.body.name.trim();
  const role = assignments[name.toLowerCase()];
  if (role !== 'Traitor') {
    return res.send(`
      ${themeCSS}
      <div class="container">
        <h2>🚫 Access Denied 🚫</h2>
        <p>You are not a traitor!</p>
        <p><a href="/traitor-login">← Go Back</a></p>
      </div>
    `);
  }
  // Redirect to the traitor chat with their name as a query parameter
  res.redirect('/traitors?name=' + encodeURIComponent(name));
});

// GET /traitors: Display traitor chat only if logged in as a traitor
app.get('/traitors', (req, res) => {
  const name = req.query.name;
  if (!name) {
    return res.redirect('/traitor-login');
  }
  
  // Verify that the provided name is actually a traitor
  const role = assignments[name.trim().toLowerCase()];
  if (role !== 'Traitor') {
    return res.send(`
      ${themeCSS}
      <div class="container">
        <h2>🚫 Access Denied 🚫</h2>
        <p>You are not a traitor!</p>
        <p><a href="/traitor-login">← Go Back</a></p>
      </div>
    `);
  }
  
  res.send(`
    ${themeCSS}
    <div class="container">
      <h2>💀 Traitor Chat 💀</h2>
      <p>Welcome, <strong>${name}</strong>!</p>
      <div class="chat-box">
        ${traitorChat.length > 0 ? traitorChat.join('<br>') : '<em>No messages yet...</em>'}
      </div>
      <form method="POST" action="/traitors?name=${encodeURIComponent(name)}" class="message-form">
        <label>Message:</label>
        <input type="text" name="message" required>
        <button type="submit">Send</button>
      </form>
    </div>
  `);
});

// POST /traitors: Accept a chat message from a logged in traitor
app.post('/traitors', (req, res) => {
  const name = req.query.name;
  if (!name) {
    return res.redirect('/traitor-login');
  }
  
  const role = assignments[name.trim().toLowerCase()];
  if (role !== 'Traitor') {
    return res.send(`
      ${themeCSS}
      <div class="container">
        <h2>🚫 Access Denied 🚫</h2>
        <p>You are not a traitor!</p>
        <p><a href="/traitor-login">← Go Back</a></p>
      </div>
    `);
  }
  
  const { message } = req.body;
  traitorChat.push(`<strong>${name}:</strong> ${message}`);
  res.redirect('/traitors?name=' + encodeURIComponent(name));
});

// ---------------- Murder Routes ----------------

// GET /murder: Display current murder status and murder selection form
app.get('/murder', (req, res) => {
  let victimText = murderVictim 
    ? `<h2 style="color: #ff4757;">⚰️ ${murderVictim} was murdered! ⚰️</h2>` 
    : "<h2>🔪 No murder yet 🔪</h2>";
  res.send(`
    ${themeCSS}
    <div class="container">
      ${victimText}
      <h2>🗡️ Traitor Murder Selection 🗡️</h2>
      <form method="POST" action="/murder">
        <label>Name to murder:</label>
        <select name="target" required>
          <option value="">-- Select a player --</option>
          ${players.map(name => `<option value="${name}">${name}</option>`).join('')}
        </select>
        <button type="submit">Murder!</button>
      </form>
    </div>
  `);
});

// POST /murder: Process murder selection (no authentication - simplified)
app.post('/murder', (req, res) => {
  const { target } = req.body;
  murderVictim = target.trim();
  res.redirect('/murder');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});