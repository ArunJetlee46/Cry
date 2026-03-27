import request from 'supertest';
import app from '../src/server.js';

describe('Health Check', () => {
  test('GET /health returns healthy status', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.status).toBe('healthy');
  });
});

describe('API Endpoints', () => {
  test('GET /api/campaigns returns campaigns list', async () => {
    const response = await request(app).get('/api/campaigns');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.pagination).toBeDefined();
  });

  test('GET /api/stats returns platform statistics', async () => {
    const response = await request(app).get('/api/stats');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });

  test('GET /api/campaigns/:id returns 404 for non-existent campaign', async () => {
    const response = await request(app).get('/api/campaigns/999999');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  test('GET /api/users/:address/profile returns user profile', async () => {
    const testAddress = '0x0000000000000000000000000000000000000000';
    const response = await request(app).get(`/api/users/${testAddress}/profile`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.address).toBe(testAddress);
  });
});

describe('Error Handling', () => {
  test('GET /nonexistent returns 404', async () => {
    const response = await request(app).get('/nonexistent');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Route not found');
  });
});
