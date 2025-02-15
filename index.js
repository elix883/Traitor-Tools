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

// ---------------- Home Route ----------------
app.get('/', (req, res) => {
  res.send(`
    <h1>Welcome to the Game</h1>
    <ul>
      <li><a href="/admin">Admin Panel</a></li>
      <li><a href="/player">Player Login</a></li>
      <li><a href="/traitor-login">Traitor Login</a></li>
      <li><a href="/murder">Murder Selection</a></li>
    </ul>
  `);
});

// ---------------- Admin Routes ----------------

// GET /admin: Admin panel to display fixed players and a button to generate roles
app.get('/admin', (req, res) => {
  res.send(`
    <h2>Admin Panel</h2>
    <p>The players are preset:</p>
    <ul>
      ${players.map(name => `<li>${name}</li>`).join('')}
    </ul>
    <form method="POST" action="/admin">
      <button type="submit">Generate Roles</button>
    </form>
  `);
});

// POST /admin: Generate roles for the fixed players
app.post('/admin', (req, res) => {
  if (gameStarted) {
    return res.send("Game already started. Refresh to reset.");
  }
  
  // Create a copy of the players array and shuffle it
  let names = [...players].sort(() => Math.random() - 0.5);
  
  // Allocate roles: first 2 are traitors, rest are faithful
  assignments = {};
  names.forEach((name, index) => {
    assignments[name.toLowerCase()] = (index < 2) ? 'Traitor' : 'Faithful';
  });
  
  gameStarted = true;
  
  res.send("Roles generated successfully! Players can now check their roles at /player.");
});

// ---------------- Player Routes ----------------

// GET /player: Player login page to check role
app.get('/player', (req, res) => {
  res.send(`
    <h2>Player Login</h2>
    <form method="POST" action="/player">
      <label>Enter your name:</label><br>
      <input type="text" name="playerName" required><br><br>
      <button type="submit">See My Role</button>
    </form>
  `);
});

// POST /player: Display the player's role
app.post('/player', (req, res) => {
  const name = req.body.playerName.trim().toLowerCase();
  const role = assignments[name];
  
  if (!role) {
    return res.send("Name not found or game not started. Check your name!");
  }
  
  res.send(`<h2>Your role is: ${role}</h2>`);
});

// ---------------- Traitor Login & Chat Routes ----------------

// GET /traitor-login: Login page for traitors
app.get('/traitor-login', (req, res) => {
  res.send(`
    <h2>Traitor Login</h2>
    <form method="POST" action="/traitor-login">
      <label>Enter your name:</label><br>
      <input type="text" name="name" required><br><br>
      <button type="submit">Login</button>
    </form>
  `);
});

// POST /traitor-login: Check if the user is a traitor and redirect
app.post('/traitor-login', (req, res) => {
  const name = req.body.name.trim();
  const role = assignments[name.toLowerCase()];
  if (role !== 'Traitor') {
    return res.send("Access denied: You are not a traitor.");
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
    return res.send("Access denied: You are not a traitor.");
  }
  
  res.send(`
    <h2>Traitor Chat</h2>
    <p>Welcome, ${name}!</p>
    <div style="border:1px solid #ccc; padding:10px; height:200px; overflow:auto;">
      ${traitorChat.join('<br>')}
    </div>
    <br>
    <form method="POST" action="/traitors?name=${encodeURIComponent(name)}">
      <label>Message:</label><br>
      <input type="text" name="message" required><br>
      <button type="submit">Send</button>
    </form>
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
    return res.send("Access denied: You are not a traitor.");
  }
  
  const { message } = req.body;
  traitorChat.push(`<strong>${name}:</strong> ${message}`);
  res.redirect('/traitors?name=' + encodeURIComponent(name));
});

// ---------------- Murder Routes ----------------

// GET /murder: Display current murder status and murder selection form
app.get('/murder', (req, res) => {
  let victimText = murderVictim ? `<h2>${murderVictim} was murdered!</h2>` : "<h2>No murder yet</h2>";
  res.send(`
    ${victimText}
    <h2>Traitor Murder Selection</h2>
    <form method="POST" action="/murder">
      <label>Your name:</label><br>
      <input type="text" name="name" required><br>
      <label>Name to murder:</label><br>
      <input type="text" name="target" required><br>
      <button type="submit">Murder!</button>
    </form>
  `);
});

// POST /murder: Process murder selection (only traitors allowed)
app.post('/murder', (req, res) => {
  const { name, target } = req.body;
  const role = assignments[name.trim().toLowerCase()];
  if (role !== 'Traitor') {
    return res.send("Access denied: Only traitors can murder.");
  }
  murderVictim = target.trim();
  res.redirect('/murder');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});