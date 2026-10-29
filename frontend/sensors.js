(() => {
  const select = (id) => document.getElementById(id);
  const number = (value) => value.toLocaleString('es-MX', {minimumFractionDigits: 1, maximumFractionDigits: 1});
  let previousSound = null;

  function clearValues() {
    for (const id of ['temperature-value', 'humidity-value', 'sound-value']) select(id).textContent = '—';
  }

  function status(text, kind) {
    select('sensors-state').textContent = text;
    select('sensors-state').className = kind;
  }

  async function poll() {
    try {
      const response = await fetch('/api/sensors', {cache: 'no-store', signal: AbortSignal.timeout(5000)});
      const data = await response.json();
      if (!response.ok || !data.online) throw new Error(data.error || 'No se pudo consultar el ESP32.');
      const reading = data.readings;
      if (reading.sample_age_ms > 10000) {
        previousSound = null;
        clearValues();
        status('Lectura atrasada', 'warning');
        select('sensors-note').textContent = 'La placa respondió, pero no está generando muestras recientes.';
        select('sensors-updated').textContent = 'Esperando una muestra nueva';
        return;
      }
      select('temperature-value').textContent = reading.dht_ok ? number(reading.temperature_c) : '—';
      select('humidity-value').textContent = reading.dht_ok ? number(reading.humidity_pct) : '—';
      const activityBetweenPolls = previousSound !== null
        && reading.uptime_ms >= previousSound.uptime
        && reading.sound_activity_count !== previousSound.count;
      select('sound-value').textContent = reading.sound_detected || activityBetweenPolls ? 'Detectado' : 'Sin detección';
      previousSound = {count: reading.sound_activity_count, uptime: reading.uptime_ms};
      status(reading.dht_ok ? 'ESP32 conectado' : 'DHT22 sin lectura', reading.dht_ok ? 'ready' : 'warning');
      select('sensors-note').textContent = reading.dht_ok
        ? 'Sonido registrado entre actualizaciones. Umbral digital, sin medición de decibeles.'
        : 'No se pudo leer temperatura y humedad. El sensor de sonido sigue disponible.';
      select('sensors-updated').textContent = `Recibido ${new Date(data.received_at).toLocaleTimeString('es-MX')}`;
    } catch (error) {
      previousSound = null;
      clearValues();
      status('Sensores no disponibles', 'error');
      select('sensors-note').textContent = error instanceof TypeError || error.name === 'TimeoutError'
        ? 'No hay respuesta. Se volverá a intentar automáticamente.' : error.message;
      select('sensors-updated').textContent = 'Esperando reconexión';
    } finally {
      window.setTimeout(poll, 3000);
    }
  }

  poll();
})();
