import assert from 'node:assert/strict';
import test from 'node:test';
import controller from '../cms/src/api/power/controllers/power.ts';
import { chartNumber, seriesPath } from '../frontend/src/lib/power-chart.js';

test('history preserves missing values and uses signed wire exchange before import/export fallbacks', async () => {
  const originalFetch = globalThis.fetch;
  const names = ['DEYE_APP_ID', 'DEYE_APP_SECRET', 'DEYE_EMAIL', 'DEYE_PASSWORD', 'DEYE_STATION_ID'];
  const originalEnv = names.map((name) => process.env[name]);
  names.forEach((name) => { process.env[name] = 'test'; });
  const samples = [
    { wirePower: 2500, gridPower: 0 },
    { wirePower: 0, purchasePower: 1000 },
    { wirePower: -1400 },
    { gridPower: 0, purchasePower: 700 },
    { gridPower: 800, purchasePower: 0 },
    { wirePower: null, gridPower: null, purchasePower: null },
    {},
  ];
  globalThis.fetch = async (url) => ({ ok: true, json: async () => String(url).includes('/account/token')
    ? { accessToken: 'test-token' }
    : { stationDataItems: samples.map((row, index) => ({ timeStamp: 1793952000 + index * 300, consumptionPower: null, ...row })) } });
  try {
    const ctx = { query: { hours: 6 } };
    await controller.history(ctx);
    assert.deepEqual(ctx.body.data.map((row) => row.gridPower), [2.5, 0, 1.4, 0.7, 0.8, null, null]);
    assert.ok(ctx.body.data.every((row) => row.consumptionPower === null));
  } finally {
    globalThis.fetch = originalFetch;
    names.forEach((name, index) => { if (originalEnv[index] === undefined) delete process.env[name]; else process.env[name] = originalEnv[index]; });
  }
});

test('chart does not turn absent measurements into zero', () => {
  for (const value of [null, undefined, '', false, 'bad']) assert.equal(chartNumber(value), null);
  assert.equal(chartNumber(0), 0);
  assert.equal(chartNumber('2.5'), 2.5);
});

test('current grid status preserves measured zero while keeping absent telemetry unknown', async () => {
  const originalFetch = globalThis.fetch;
  const names = ['DEYE_APP_ID', 'DEYE_APP_SECRET', 'DEYE_EMAIL', 'DEYE_PASSWORD', 'DEYE_STATION_ID'];
  const originalEnv = names.map((name) => process.env[name]);
  names.forEach((name) => { process.env[name] = 'test'; });
  const cases = [
    [{ gridPower: null, wirePower: 0, purchasePower: null }, 'offline', 0],
    [{ gridPower: 0, wirePower: null, purchasePower: null }, 'offline', 0],
    [{ gridPower: null, wirePower: null, purchasePower: 0 }, 'offline', 0],
    [{ gridPower: 0, wirePower: 1800, purchasePower: null }, 'online', 1.8],
    [{ gridPower: null, wirePower: -1200, purchasePower: null }, 'online', -1.2],
    [{ gridPower: null, wirePower: null, purchasePower: null }, 'unknown', null],
    [{}, 'unknown', null],
  ];
  try {
    for (const [raw, status, power] of cases) {
      globalThis.fetch = async (url) => ({ ok: true, json: async () => String(url).includes('/account/token') ? { accessToken: 'test-token' } : raw });
      const ctx = {};
      await controller.status(ctx);
      assert.equal(ctx.body.data.gridStatus, status, JSON.stringify(raw));
      assert.equal(ctx.body.data.gridPower, power, JSON.stringify(raw));
    }
  } finally {
    globalThis.fetch = originalFetch;
    names.forEach((name, index) => { if (originalEnv[index] === undefined) delete process.env[name]; else process.env[name] = originalEnv[index]; });
  }
});

const x = (row) => row.time / 60_000;
test('weekly API fetches seven bounded days, deduplicates boundaries and caches the result', async () => {
  const originalFetch = globalThis.fetch;
  const names = ['DEYE_APP_ID', 'DEYE_APP_SECRET', 'DEYE_EMAIL', 'DEYE_PASSWORD', 'DEYE_STATION_ID'];
  const originalEnv = names.map((name) => process.env[name]);
  names.forEach((name) => { process.env[name] = 'weekly-test'; });
  const requests = [];
  globalThis.fetch = async (url, options) => {
    if (String(url).includes('/account/token')) return { ok: true, json: async () => ({ accessToken: 'test-token' }) };
    const body = JSON.parse(options.body);
    requests.push(body);
    return { ok: true, json: async () => ({ stationDataItems: [body.startTimestamp, body.endTimestamp].map((timeStamp) => ({ timeStamp, wirePower: 0 })) }) };
  };
  try {
    const ctx = { query: { hours: 168 } };
    await controller.history(ctx);
    assert.equal(requests.length, 7);
    assert.ok(requests.every((request) => request.endTimestamp - request.startTimestamp === 86400));
    assert.equal(ctx.body.data.length, 8);
    for (let index = 1; index < requests.length; index += 1) assert.equal(requests[index].startTimestamp, requests[index - 1].endTimestamp);
    const again = { query: { hours: 168 } };
    await controller.history(again);
    assert.deepEqual(again.body, ctx.body);
    assert.equal(requests.length, 7);
  } finally {
    globalThis.fetch = originalFetch;
    names.forEach((name, index) => { if (originalEnv[index] === undefined) delete process.env[name]; else process.env[name] = originalEnv[index]; });
  }
});

const y = (value) => 100 - value * 10;
test('grid outage stays flat at zero with vertical transitions', () => {
  const points = [2, 0, 0, 3].map((gridPower, index) => ({ time: index * 300_000, gridPower }));
  assert.equal(seriesPath(points, 'gridPower', x, y, true), 'M 0.0 80.0 H 5.0 V 100.0 H 10.0 V 100.0 H 15.0 V 70.0');
});

test('unknown measurements and telemetry gaps break the line', () => {
  const points = [{ time: 0, gridPower: 2 }, { time: 300_000, gridPower: null }, { time: 600_000, gridPower: 0 }, { time: 1_500_000, gridPower: 1 }];
  assert.equal(seriesPath(points, 'gridPower', x, y, true), 'M 0.0 80.0 M 10.0 100.0 M 25.0 90.0');
});
