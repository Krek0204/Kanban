const express = require('express');
const request = require('supertest');

jest.mock('../middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { userId: 1 };
    next();
  }
}));

jest.mock('../database', () => ({
  db: {
    createDesk: jest.fn(),
    getDeskById: jest.fn(),
    deleteDesk: jest.fn()
  }
}));

const { db } = require('../database');
const desksRouter = require('./desks');

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/desks', desksRouter);
  return app;
};

describe('desks routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/desks creates a new desk', async () => {
    db.createDesk.mockResolvedValue({
      id: 10,
      name: 'Новая доска',
      userId: 1,
      tasksList: []
    });

    const app = createApp();
    const response = await request(app)
      .post('/api/desks')
      .send({ name: 'Новая доска' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: 10,
      name: 'Новая доска',
      userId: 1,
      tasksList: []
    });
    expect(db.createDesk).toHaveBeenCalledWith({
      name: 'Новая доска',
      userId: 1,
      tasksList: []
    });
  });

  test('DELETE /api/desks/:id deletes desk of current user', async () => {
    db.getDeskById.mockResolvedValue({
      id: 7,
      name: 'Desk',
      userId: 1,
      tasksList: []
    });
    db.deleteDesk.mockResolvedValue(true);

    const app = createApp();
    const response = await request(app).delete('/api/desks/7');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
    expect(db.getDeskById).toHaveBeenCalledWith(7);
    expect(db.deleteDesk).toHaveBeenCalledWith(7);
  });
});
