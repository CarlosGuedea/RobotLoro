"""Hardware simulado SOLO para pruebas: ESP32-CAM (/capture, /health) y ESP32 de sensores (/readings).

python3 backend/tests/mock_camera.py --port 8001 [--sound-dbfs]
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
                       "sound_detected": random.random() < 0.3, "sound_level": 1,
                       "sound_activity_count": int(t // 10), "sample_age_ms": 120, "uptime_ms": int(t * 1000)}
            if self.server.sound_dbfs:
                reading["sound_dbfs"] = round(-24 + 6 * math.sin(t / 60) + random.uniform(-1, 1), 1)
            self.send(200, "application/json", json.dumps(reading).encode())
        else:
            self.send_error(404)

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8001)
    parser.add_argument("--sound-dbfs", action="store_true", help="Simula un micrófono que reporta dBFS")
    args = parser.parse_args()
    print(f"SOLO PRUEBAS: cámara y sensores simulados en http://127.0.0.1:{args.port}", flush=True)
    with ThreadingHTTPServer(("127.0.0.1", args.port), MockHardware) as server:
        server.sound_dbfs = args.sound_dbfs
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
