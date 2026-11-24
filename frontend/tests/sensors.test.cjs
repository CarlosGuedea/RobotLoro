const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'sensors.js'), 'utf8');

function reading(changes = {}) {
  return {online: true, received_at: '2026-10-29T15:00:00Z', readings: {
    temperature_c: 25, humidity_pct: 50, dht_ok: true, sound_detected: false,
    sound_activity_count: 1, sample_age_ms: 100, uptime_ms: 10000, ...changes,
  }};
}

async function mount() {
  const nodes = new Map();
  const timers = [];
  let reply = reading();
  const select = id => {
    if (!nodes.has(id)) nodes.set(id, {textContent: '', className: ''});
    return nodes.get(id);
  };
  vm.runInNewContext(source, {
    document: {getElementById: select}, Date, TypeError, AbortSignal,
    window: {setTimeout: fn => timers.push(fn)},
    fetch: async () => ({ok: reply.online, json: async () => reply}),
  });
  await new Promise(setImmediate);
  return {select, async next(data) {reply = data; await timers.shift()();}};
}

test('reports sound even when its positive sample was overwritten between polls', async () => {
  const app = await mount();
  assert.equal(app.select('sound-value').textContent, 'Sin detección');
  await app.next(reading({sound_detected: false, sound_activity_count: 2, uptime_ms: 15000}));
  assert.equal(app.select('sound-value').textContent, 'Detectado');
  await app.next(reading({sound_activity_count: 2, uptime_ms: 17500}));
  assert.equal(app.select('sound-value').textContent, 'Sin detección');
});

test('keeps a detected event visible through microphone failure and recovery', async () => {
  const app = await mount();
  await app.next(reading({sound_source: 'inmp441', sound_ok: true, sound_dbfs: -40,
    sound_rms: 0.01, sound_peak_dbfs: -40, sound_threshold_dbfs: -35,
    sound_clipped: false, sound_age_ms: 50, sound_activity_count: 1}));
  await app.next(reading({sound_source: 'inmp441', sound_ok: false, sound_dbfs: null,
    sound_rms: null, sound_peak_dbfs: null, sound_threshold_dbfs: -35,
    sound_clipped: false, sound_age_ms: 50, sound_activity_count: 2, uptime_ms: 15000}));
  assert.equal(app.select('sound-value').textContent, 'Detectado antes del fallo');
  await app.next(reading({sound_source: 'inmp441', sound_ok: true, sound_dbfs: -45,
    sound_rms: 0.005, sound_peak_dbfs: -45, sound_threshold_dbfs: -35,
    sound_clipped: false, sound_age_ms: 50, sound_activity_count: 2, uptime_ms: 20000}));
  assert.equal(app.select('sound-value').textContent, 'Sin detección');
});

test('DHT failure clears only temperature and humidity', async () => {
  const app = await mount();
  await app.next(reading({dht_ok: false, temperature_c: null, humidity_pct: null, sound_detected: true}));
  assert.equal(app.select('temperature-value').textContent, '—');
  assert.equal(app.select('humidity-value').textContent, '—');
  assert.equal(app.select('sound-value').textContent, 'Detectado');
});

test('offline and stale samples clear previously displayed values', async () => {
  const app = await mount();
  await app.next({online: false, error: 'offline', readings: null});
  assert.equal(app.select('temperature-value').textContent, '—');
  assert.equal(app.select('sound-value').textContent, '—');
  await app.next(reading({sound_activity_count: 10, uptime_ms: 30000}));
  assert.equal(app.select('sound-value').textContent, 'Sin detección');
  await app.next(reading({sample_age_ms: 10001}));
  assert.equal(app.select('sensors-state').textContent, 'Lectura atrasada');
  assert.equal(app.select('humidity-value').textContent, '—');
});

test('reboot does not invent a sound event from a reset counter', async () => {
  const app = await mount();
  await app.next(reading({sound_activity_count: 0, uptime_ms: 2500}));
  assert.equal(app.select('sound-value').textContent, 'Sin detección');
});

test('INMP441 shows dBFS and mic failure leaves DHT visible', async () => {
  const app = await mount();
  await app.next(reading({sound_source: 'inmp441', sound_ok: true, sound_dbfs: -40,
    sound_threshold_dbfs: -35, sound_clipped: false, sound_age_ms: 50}));
  assert.equal(app.select('audio-dbfs').textContent, '-40.0');
  await app.next(reading({sound_source: 'inmp441', sound_ok: false, sound_dbfs: null,
    sound_threshold_dbfs: -35, sound_clipped: false, sound_age_ms: 50}));
  assert.equal(app.select('audio-dbfs').textContent, '—');
  assert.equal(app.select('temperature-value').textContent, '25.0');
  assert.equal(app.select('sound-value').textContent, 'Sin señal de audio');
});
