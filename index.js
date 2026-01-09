const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Path to the players data file
const playersFilePath = path.join(__dirname, 'players.json');

// Default list of players
const defaultPlayers = ["Alina", "Alex", "Ollie", "Bob", "Gus", "DanO", "DanE", "Vicky", "Grace", "Lottie"];

// Load players from file or use default
let players = [];
function loadPlayers() {
  try {
    if (fs.existsSync(playersFilePath)) {
      const data = fs.readFileSync(playersFilePath, 'utf8');
      const parsed = JSON.parse(data);
      
      // Validate that parsed data is an array of strings
      if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
        players = parsed;
      } else {
        console.error('Invalid players.json format, using default players');
        players = [...defaultPlayers];
        savePlayers();
      }
    } else {
      players = [...defaultPlayers];
      savePlayers();
    }
  } catch (error) {
    console.error('Error loading players:', error);
    players = [...defaultPlayers];
  }
}

// Save players to file
function savePlayers() {
  try {
    fs.writeFileSync(playersFilePath, JSON.stringify(players, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving players:', error);
  }
}

// Initialize players on startup
loadPlayers();

// Helper function to escape HTML to prevent XSS
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

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
        <li><a href="/edit-players">📝 Edit Player List</a></li>
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
        <p><a href="/admin">← Go Back</a></p>
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
      <h2>✅ Roles Generated! ✅</h2>
      <p>Players can now check their roles at <a href="/player">/player</a>.</p>
      <p><a href="/">← Return Home</a></p>
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
        <label>Select your name:</label>
        <select name="playerName" required>
          <option value="">-- Select a player --</option>
          ${players.map(name => `<option value="${name}">${name}</option>`).join('')}
        </select>
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
        ${traitorChat.length > 0 ? traitorChat.join('<br>') : '<em style="color: #888;">No messages yet...</em>'}
      </div>
      <form method="POST" action="/traitors?name=${encodeURIComponent(name)}" class="message-form">
        <label>Message:</label>
        <input type="text" name="message" required>
        <button type="submit">Send</button>
      </form>
      <p style="margin-top: 20px;"><a href="/">← Return Home</a></p>
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
  traitorChat.push(`<strong>${escapeHtml(name)}:</strong> ${escapeHtml(message)}`);
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
        <label>Select target to murder:</label>
        <select name="target" required>
          <option value="">-- Select a player --</option>
          ${players.map(name => `<option value="${name}">${name}</option>`).join('')}
        </select>
        <button type="submit">Murder!</button>
      </form>
      <p style="margin-top: 20px;"><a href="/">← Return Home</a></p>
    </div>
  `);
});

// POST /murder: Process murder selection (simplified - no authentication)
app.post('/murder', (req, res) => {
  const { target } = req.body;
  if (!target || !target.trim()) {
    return res.send(`
      ${themeCSS}
      <div class="container">
        <h2>❌ Error ❌</h2>
        <p>Please select a valid target!</p>
        <p><a href="/murder">← Go Back</a></p>
      </div>
    `);
  }
  murderVictim = target.trim();
  res.redirect('/murder');
});

// ---------------- Player List Editor Routes ----------------

// GET /edit-players: Display player list editor
app.get('/edit-players', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Edit Player List</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
        h1 { color: #333; }
        .player-list { list-style: none; padding: 0; }
        .player-item { 
          display: flex; 
          align-items: center; 
          margin: 10px 0; 
          padding: 10px; 
          background: #f5f5f5; 
          border-radius: 5px; 
        }
        .player-name { flex: 1; font-size: 16px; }
        .edit-input { flex: 1; font-size: 16px; padding: 5px; }
        button { 
          padding: 5px 15px; 
          margin-left: 5px; 
          cursor: pointer; 
          border: none; 
          border-radius: 3px; 
          background: #007bff; 
          color: white; 
        }
        button:hover { background: #0056b3; }
        .delete-btn { background: #dc3545; }
        .delete-btn:hover { background: #c82333; }
        .save-btn { background: #28a745; }
        .save-btn:hover { background: #218838; }
        .cancel-btn { background: #6c757d; }
        .cancel-btn:hover { background: #5a6268; }
        .add-player { margin: 20px 0; padding: 15px; background: #e9ecef; border-radius: 5px; }
        .add-player input { padding: 8px; font-size: 16px; width: 300px; }
        .add-player button { padding: 8px 20px; }
        .error { color: #dc3545; margin: 10px 0; }
        .success { color: #28a745; margin: 10px 0; }
        .back-link { display: inline-block; margin-top: 20px; }
      </style>
    </head>
    <body>
      <h1>Edit Player List</h1>
      ${req.query.error ? `<p class="error">${escapeHtml(req.query.error)}</p>` : ''}
      ${req.query.success ? `<p class="success">${escapeHtml(req.query.success)}</p>` : ''}
      
      <div class="add-player">
        <h3>Add New Player</h3>
        <form method="POST" action="/edit-players/add">
          <input type="text" name="playerName" placeholder="Enter player name" required>
          <button type="submit">Add Player</button>
        </form>
      </div>

      <h3>Current Players (${players.length})</h3>
      <ul class="player-list">
        ${players.map((player, index) => {
          const escapedPlayer = escapeHtml(player);
          const encodedPlayer = encodeURIComponent(player);
          return `
          <li class="player-item" id="player-${index}">
            <span class="player-name" id="name-${index}">${escapedPlayer}</span>
            <input type="text" class="edit-input" id="edit-${index}" value="${escapedPlayer}" style="display:none;">
            <button class="edit-btn" id="edit-btn-${index}" onclick="editPlayer(${index})">Edit</button>
            <button class="save-btn" id="save-${index}" onclick="savePlayer(${index})" style="display:none;">Save</button>
            <button class="cancel-btn" id="cancel-${index}" onclick="cancelEdit(${index})" style="display:none;">Cancel</button>
            <form method="POST" action="/edit-players/delete" style="display:inline;">
              <input type="hidden" name="playerName" value="${escapedPlayer}">
              <button type="submit" class="delete-btn" id="delete-btn-${index}" onclick="return confirm('Are you sure you want to remove ' + decodeURIComponent('${encodedPlayer}') + '?')">Remove</button>
            </form>
          </li>
        `;
        }).join('')}
      </ul>

      <a href="/" class="back-link">← Back to Home</a>

      <script>
        function editPlayer(index) {
          document.getElementById('name-' + index).style.display = 'none';
          document.getElementById('edit-' + index).style.display = 'inline';
          document.getElementById('save-' + index).style.display = 'inline';
          document.getElementById('cancel-' + index).style.display = 'inline';
          document.getElementById('edit-btn-' + index).style.display = 'none';
          document.getElementById('delete-btn-' + index).style.display = 'none';
        }

        function cancelEdit(index) {
          const originalName = document.getElementById('name-' + index).textContent;
          document.getElementById('edit-' + index).value = originalName;
          document.getElementById('name-' + index).style.display = 'inline';
          document.getElementById('edit-' + index).style.display = 'none';
          document.getElementById('save-' + index).style.display = 'none';
          document.getElementById('cancel-' + index).style.display = 'none';
          document.getElementById('edit-btn-' + index).style.display = 'inline';
          document.getElementById('delete-btn-' + index).style.display = 'inline';
        }

        function savePlayer(index) {
          const oldName = document.getElementById('name-' + index).textContent;
          const newName = document.getElementById('edit-' + index).value.trim();
          
          if (!newName) {
            alert('Player name cannot be empty!');
            return;
          }

          const form = document.createElement('form');
          form.method = 'POST';
          form.action = '/edit-players/update';
          
          const oldInput = document.createElement('input');
          oldInput.type = 'hidden';
          oldInput.name = 'oldName';
          oldInput.value = oldName;
          
          const newInput = document.createElement('input');
          newInput.type = 'hidden';
          newInput.name = 'newName';
          newInput.value = newName;
          
          form.appendChild(oldInput);
          form.appendChild(newInput);
          document.body.appendChild(form);
          form.submit();
        }
      </script>
    </body>
    </html>
  `);
});

// POST /edit-players/add: Add a new player
app.post('/edit-players/add', (req, res) => {
  const newPlayer = req.body.playerName.trim();
  
  // Validation
  if (!newPlayer) {
    return res.redirect('/edit-players?error=' + encodeURIComponent('Player name cannot be empty'));
  }
  
  // Check for duplicates (case-insensitive)
  const playerLower = newPlayer.toLowerCase();
  const isDuplicate = players.some(p => p.toLowerCase() === playerLower);
  
  if (isDuplicate) {
    return res.redirect('/edit-players?error=' + encodeURIComponent('Player "' + newPlayer + '" already exists'));
  }
  
  // Add player and save
  players.push(newPlayer);
  savePlayers();
  
  // Reset game state when player list changes
  gameStarted = false;
  assignments = {};
  traitorChat = [];
  murderVictim = null;
  
  res.redirect('/edit-players?success=' + encodeURIComponent('Player "' + newPlayer + '" added successfully'));
});

// POST /edit-players/delete: Remove a player
app.post('/edit-players/delete', (req, res) => {
  const playerToRemove = req.body.playerName;
  
  const index = players.indexOf(playerToRemove);
  if (index > -1) {
    players.splice(index, 1);
    savePlayers();
    
    // Reset game state when player list changes
    gameStarted = false;
    assignments = {};
    traitorChat = [];
    murderVictim = null;
    
    res.redirect('/edit-players?success=' + encodeURIComponent('Player "' + playerToRemove + '" removed successfully'));
  } else {
    res.redirect('/edit-players?error=' + encodeURIComponent('Player not found'));
  }
});

// POST /edit-players/update: Update a player's name
app.post('/edit-players/update', (req, res) => {
  const oldName = req.body.oldName;
  const newName = req.body.newName.trim();
  
  // Validation
  if (!newName) {
    return res.redirect('/edit-players?error=' + encodeURIComponent('Player name cannot be empty'));
  }
  
  // Check if the new name already exists (case-insensitive), excluding the current player
  const newNameLower = newName.toLowerCase();
  const isDuplicate = players.some(p => p.toLowerCase() === newNameLower && p !== oldName);
  
  if (isDuplicate) {
    return res.redirect('/edit-players?error=' + encodeURIComponent('Player "' + newName + '" already exists'));
  }
  
  const index = players.indexOf(oldName);
  if (index > -1) {
    players[index] = newName;
    savePlayers();
    
    // Reset game state when player list changes
    gameStarted = false;
    assignments = {};
    traitorChat = [];
    murderVictim = null;
    
    res.redirect('/edit-players?success=' + encodeURIComponent('Player updated from "' + oldName + '" to "' + newName + '"'));
  } else {
    res.redirect('/edit-players?error=' + encodeURIComponent('Player not found'));
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});