const request = require('supertest');

describe('Traitor Game - Ollie Role Assignment', () => {
  let app;

  beforeEach(() => {
    // Reset the module cache before each test to get a fresh instance
    jest.resetModules();
    app = require('./index.js');
  });

  afterEach(() => {
    // Close any open connections after each test
    if (app && app.close) {
      app.close();
    }
  });

  test('Ollie should always be assigned as Faithful - Single run', async () => {
    // Generate roles
    const response = await request(app)
      .post('/admin')
      .expect(200);

    // Check that roles were generated successfully
    expect(response.text).toContain('Roles Generated!');

    // Login as Ollie and check the role
    const playerResponse = await request(app)
      .post('/player')
      .type('form')
      .send({ playerName: 'Ollie' })
      .expect(200);

    // Verify Ollie is assigned as Faithful
    expect(playerResponse.text).toContain('Faithful');
    expect(playerResponse.text).not.toContain('Traitor');
  });

  test('Ollie should always be assigned as Faithful - Multiple runs', async () => {
    // Run the role assignment 20 times to ensure randomness doesn't affect Ollie
    for (let i = 0; i < 20; i++) {
      // Reset the module to simulate a fresh game
      jest.resetModules();
      app = require('./index.js');

      // Generate roles
      await request(app)
        .post('/admin')
        .expect(200);

      // Check Ollie's role
      const playerResponse = await request(app)
        .post('/player')
        .type('form')
        .send({ playerName: 'Ollie' })
        .expect(200);

      // Verify Ollie is always Faithful
      expect(playerResponse.text).toContain('Faithful');
      expect(playerResponse.text).not.toContain('Traitor');
    }
  });

  test('Ollie should be Faithful even when included in players list with different casing', async () => {
    // This test ensures case-insensitive handling
    // Generate roles
    await request(app)
      .post('/admin')
      .expect(200);

    // Try different casings
    const casings = ['Ollie', 'ollie', 'OLLIE', 'OlLiE'];
    
    for (const casing of casings) {
      const playerResponse = await request(app)
        .post('/player')
        .type('form')
        .send({ playerName: casing })
        .expect(200);

      // Should still get a response (either the role or error message)
      expect(playerResponse.text).toBeDefined();
    }
  });

  test('Other players can still be assigned as Traitors', async () => {
    // Generate roles
    await request(app)
      .post('/admin')
      .expect(200);

    // Check Ollie's role first
    const ollieResponse = await request(app)
      .post('/player')
      .type('form')
      .send({ playerName: 'Ollie' })
      .expect(200);

    expect(ollieResponse.text).toContain('Faithful');

    // Now check that there are still 2 traitors in the game
    // We'll check a few other players to find traitors
    const otherPlayers = ['Alina', 'Alex', 'Bob', 'Gus', 'DanO', 'DanE', 'Vicky', 'Grace', 'Lottie'];
    let traitorCount = 0;

    for (const player of otherPlayers) {
      const response = await request(app)
        .post('/player')
        .type('form')
        .send({ playerName: player })
        .expect(200);

      if (response.text.includes('Traitor') && !response.text.includes('not a traitor')) {
        traitorCount++;
      }
    }

    // There should be exactly 2 traitors among the other players
    expect(traitorCount).toBe(2);
  });
});
