"""Hardware simulado SOLO para pruebas: ESP32-CAM (/capture, /health) y ESP32 de sensores (/readings).

python3 backend/tests/mock_camera.py --port 8001 [--ky038]

Por defecto imita el firmware con INMP441 (ruido en dBFS); --ky038, el detector digital anterior.
"""
import argparse
import io
import json
import math
import random
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from PIL import Image, ImageDraw

STARTED = time.monotonic()


class MockHardware(BaseHTTPRequestHandler):
    def send(self, status, mime, body):
        self.send_response(status)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/capture":
            image = Image.new("RGB", (800, 600), "#dce6df")
            draw = ImageDraw.Draw(image)
            draw.rectangle((40, 40, 760, 560), outline="#4c7159", width=3)
            draw.text((80, 260), "CAMARA SIMULADA - SOLO PRUEBAS", fill="#213e2b", font_size=28)
            data = io.BytesIO()
            image.save(data, "JPEG")
            self.send(200, "image/jpeg", data.getvalue())
        elif self.path == "/health":
            self.send(200, "application/json", b'{"camera_ready":true}')
        elif self.path in ("/", "/readings"):
            t = time.monotonic() - STARTED
            reading = {"temperature_c": round(29.5 + 1.5 * math.sin(t / 120) + random.uniform(-0.2, 0.2), 1),
                       "humidity_pct": round(55 + 5 * math.sin(t / 200), 1), "dht_ok": True,
                       "sound_activity_count": int(t // 10), "sample_age_ms": 120, "uptime_ms": int(t * 1000)}
            if self.server.ky038:
                reading.update(sound_detected=random.random() < 0.3, sound_level=1)
            else:  # Mismo formato que firmware/esp32_sensores con INMP441.
                dbfs = round(-24 + 6 * math.sin(t / 60) + random.uniform(-1, 1), 1)
                reading.update(sound_source="inmp441", sound_level=None, sound_ok=True,
                               sound_rms=round(10 ** (dbfs / 20), 8), sound_dbfs=dbfs,
                               sound_peak_dbfs=round(min(dbfs + 9, 0), 1), sound_threshold_dbfs=-35.0,
                               sound_clipped=False, sound_age_ms=40, sound_detected=dbfs > -35)
            self.send(200, "application/json", json.dumps(reading).encode())
        else:
            self.send_error(404)

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8001)
    parser.add_argument("--ky038", action="store_true", help="Detector digital anterior (sin dBFS)")
    args = parser.parse_args()
    print(f"SOLO PRUEBAS: cámara y sensores simulados en http://127.0.0.1:{args.port}", flush=True)
    with ThreadingHTTPServer(("127.0.0.1", args.port), MockHardware) as server:
        server.ky038 = args.ky038
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
