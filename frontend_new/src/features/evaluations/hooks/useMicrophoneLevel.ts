import { useState } from 'react'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Mide el nivel de ruido en dBFS (RMS) con el micrófono de este dispositivo.
 * Se desactivan el control de ganancia y la supresión de ruido del navegador para no
 * alterar el nivel. Solo funciona en contexto seguro (localhost o HTTPS).
 */
export function useMicrophoneLevel() {
  const [measuring, setMeasuring] = useState(false)
  const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

  async function measure(durationMs = 3_000): Promise<number> {
    setMeasuring(true)
    let stream: MediaStream | undefined
    let context: AudioContext | undefined
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      })
      context = new AudioContext()
      const analyser = context.createAnalyser()
      analyser.fftSize = 2048
      context.createMediaStreamSource(stream).connect(analyser)
      const buffer = new Float32Array(analyser.fftSize)
      let sum = 0
      let count = 0
      const end = performance.now() + durationMs
      while (performance.now() < end) {
        await sleep(40) // ~ la duración del búfer a 48 kHz: cubre casi toda la ventana.
        analyser.getFloatTimeDomainData(buffer)
        for (const sample of buffer) sum += sample * sample
        count += buffer.length
      }
      const rms = Math.sqrt(sum / Math.max(count, 1))
      const dbfs = 20 * Math.log10(Math.max(rms, 1e-6))
      return Math.round(Math.min(0, Math.max(-120, dbfs)) * 10) / 10
    } finally {
      stream?.getTracks().forEach((track) => track.stop())
      void context?.close()
      setMeasuring(false)
    }
  }

  return { measure, measuring, supported }
}
