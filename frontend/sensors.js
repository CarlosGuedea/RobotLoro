(() => {
  const select = (id) => document.getElementById(id);
  const number = (value) => value.toLocaleString('es-MX', {minimumFractionDigits: 1, maximumFractionDigits: 1});
  let previousSound = null;

  function clearValues() {
    for (const id of ['temperature-value', 'humidity-value', 'sound-value', 'audio-dbfs']) select(id).textContent = '—';
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
      const microphone = reading.sound_source === 'inmp441';
      const audioOk = !microphone || (reading.sound_ok && reading.sound_age_ms <= 5000);
      select('audio-level').hidden = !microphone;
      select('audio-dbfs').textContent = microphone && audioOk ? number(reading.sound_dbfs) : '—';
      const activityBetweenPolls = previousSound !== null
        && reading.uptime_ms >= previousSound.uptime
        && reading.sound_activity_count !== previousSound.count;
      const soundDetected = reading.sound_detected || activityBetweenPolls;
      select('sound-value').textContent = soundDetected
        ? (audioOk ? 'Detectado' : 'Detectado antes del fallo')
        : (!audioOk ? 'Sin señal de audio' : 'Sin detección');
      previousSound = {count: reading.sound_activity_count, uptime: reading.uptime_ms};
      const clipped = microphone && audioOk && reading.sound_clipped;
      const healthy = reading.dht_ok && audioOk && !clipped;
      const label = !reading.dht_ok && !audioOk ? 'DHT22 y micrófono sin lectura'
        : !reading.dht_ok ? 'DHT22 sin lectura' : !audioOk ? 'INMP441 sin señal'
        : clipped ? 'Audio saturado' : 'ESP32 conectado';
      status(label, healthy ? 'ready' : 'warning');
      const notes = [];
      if (!reading.dht_ok) notes.push('No se pudo leer temperatura y humedad.');
      if (!audioOk) notes.push('Revisa las conexiones I²S y el canal L/R del micrófono.');
      else if (microphone) {
        notes.push(`Umbral ${number(reading.sound_threshold_dbfs)} dBFS. Nivel digital, sin calibración SPL.`);
        if (clipped) notes.push('La señal alcanzó el límite digital.');
      } else notes.push('Sonido por umbral digital, sin medición de decibeles.');
      select('sensors-note').textContent = notes.join(' ');
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
