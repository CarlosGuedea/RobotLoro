"""Captura bajo demanda. Inicio: python3 backend/server.py --camera-url http://esp32cam.local"""

import argparse
import io
import json
import logging
import os
import threading
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import ProxyHandler, Request, build_opener

from PIL import Image

if __package__:
    from .sensors import fetch_readings
else:
    from sensors import fetch_readings

MAX_FRAME_BYTES = 2 * 1024 * 1024
FRONTEND = Path(__file__).resolve().parent.parent / "frontend"
ASSETS = {"/": ("index.html", "text/html; charset=utf-8"),
          "/styles.css": ("styles.css", "text/css; charset=utf-8"),
          "/app.js": ("app.js", "text/javascript; charset=utf-8"),
          "/sensors.js": ("sensors.js", "text/javascript; charset=utf-8"),
          "/geist.woff2": ("geist.woff2", "font/woff2")}


class CaptureServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address, camera_url, timeout, sensors_url, sensors_timeout):
        super().__init__(address, Handler)
        self.camera_url = camera_url.rstrip("/")
        self.camera_timeout = timeout
        self.sensors_url = sensors_url.rstrip("/")
        self.sensors_timeout = sensors_timeout
        self.capture_lock = threading.Lock()
        self.state_lock = threading.Lock()
        self.latest = None
        self.captured_at = None
        self.capture_count = 0


class Handler(BaseHTTPRequestHandler):
    def setup(self):
        super().setup()
        self.connection.settimeout(15)

    def respond(self, status, data, mime="application/json; charset=utf-8", headers=None):
        self.send_response(status)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        for name, value in (headers or {}).items():
            self.send_header(name, value)
        self.end_headers()
        try:
            self.wfile.write(data)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def json(self, status, value):
        self.respond(status, json.dumps(value, ensure_ascii=False).encode())

    def do_GET(self):
        path = urlsplit(self.path).path
        if path in ASSETS:
            name, mime = ASSETS[path]
            try:
                self.respond(200, (FRONTEND / name).read_bytes(), mime)
            except FileNotFoundError:
                self.json(404, {"error": "Archivo del frontend no encontrado."})
        elif path == "/api/status":
            with self.server.state_lock:
                state = {"camera_url": self.server.camera_url,
                         "capture_count": self.server.capture_count,
                         "captured_at": self.server.captured_at,
                         "has_image": self.server.latest is not None}
                state["sensors_url"] = self.server.sensors_url
            self.json(200, state)
        elif path == "/api/sensors":
            try:
                reading = fetch_readings(self.server.sensors_url, self.server.sensors_timeout)
                self.json(200, {"online": True, "readings": reading,
                                "received_at": datetime.now(timezone.utc).isoformat()})
            except Exception as error:
                logging.warning("Sensores no disponibles (%s): %s", self.server.sensors_url, error)
                self.json(502, {"online": False, "readings": None, "received_at": None,
                                "error": "No hay una lectura válida del ESP32. Revisa su alimentación y conexión Wi-Fi."})
        elif path == "/api/latest.jpg":
            with self.server.state_lock:
                data, captured_at = self.server.latest, self.server.captured_at
            if data is None:
                self.json(404, {"error": "Todavía no se ha tomado una foto."})
            else:
                self.respond(200, data, "image/jpeg", {"X-Captured-At": captured_at})
        elif path == "/api/capture":
            self.respond(405, b'{"error":"Usa POST para tomar una foto."}',
                         headers={"Allow": "POST"})
        else:
            self.json(404, {"error": "Ruta no encontrada."})

    def do_POST(self):
        if urlsplit(self.path).path != "/api/capture":
            self.json(404, {"error": "Ruta no encontrada."})
            return
        if not self.server.capture_lock.acquire(blocking=False):
            self.json(409, {"error": "Ya hay una captura en curso. Intenta de nuevo."})
            return
        try:
            # Sin proxies del sistema: la cámara se consulta directamente en la LAN.
            request = Request(self.server.camera_url + "/capture", headers={"Accept": "image/jpeg"})
            with build_opener(ProxyHandler({})).open(request, timeout=self.server.camera_timeout) as response:
                if response.headers.get_content_type() != "image/jpeg":
                    raise ValueError("La cámara no respondió con una imagen JPEG.")
                length = response.headers.get("Content-Length")
                if length is not None and (int(length) <= 0 or int(length) > MAX_FRAME_BYTES):
                    raise ValueError("La imagen tiene un tamaño no permitido.")
                data = response.read(MAX_FRAME_BYTES + 1)
            if not data or len(data) > MAX_FRAME_BYTES:
                raise ValueError("La imagen está vacía o supera 2 MiB.")
            with Image.open(io.BytesIO(data)) as image:
                if image.format != "JPEG" or image.width * image.height > 5_000_000:
                    raise ValueError("La respuesta no es una foto JPEG válida.")
                # JPEG.verify() no detecta todos los archivos truncados: decodificar también.
                image.load()
            captured_at = datetime.now(timezone.utc).isoformat()
            with self.server.state_lock:
                self.server.latest = data
                self.server.captured_at = captured_at
                self.server.capture_count += 1
            self.respond(200, data, "image/jpeg", {"X-Captured-At": captured_at})
        except Exception as error:
            logging.warning("Captura fallida (%s): %s", self.server.camera_url, error)
            self.json(502, {"error": "No se pudo obtener la foto. Revisa la alimentación, la red y la dirección de la cámara."})
        finally:
            self.server.capture_lock.release()

    def log_message(self, fmt, *args):
        logging.info("%s %s", self.client_address[0], fmt % args)


def validate_device_url(url):
    parsed = urlsplit(url)
    if (parsed.scheme != "http" or not parsed.hostname or parsed.username or parsed.password
            or parsed.path not in ("", "/") or parsed.query or parsed.fragment):
        raise ValueError("Usa una dirección base HTTP, por ejemplo http://192.168.1.50")


def create_server(host="127.0.0.1", port=8000, camera_url="http://esp32cam.local", timeout=8,
                  sensors_url="http://esp32sensores.local", sensors_timeout=3):
    parsed = urlsplit(camera_url)
    if (parsed.scheme != "http" or not parsed.hostname or parsed.username or parsed.password
            or parsed.path not in ("", "/") or parsed.query or parsed.fragment):
        raise ValueError("Usa una dirección base como http://esp32cam.local o http://192.168.1.50")
    validate_device_url(sensors_url)
    if timeout <= 0 or sensors_timeout <= 0:
        raise ValueError("El timeout debe ser positivo.")
    return CaptureServer((host, port), camera_url, timeout, sensors_url, sensors_timeout)


def main():
    parser = argparse.ArgumentParser(description="Proyecto Loro: servidor de captura ESP32-CAM")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--camera-url", default=os.getenv("CAMERA_URL", "http://esp32cam.local"))
    parser.add_argument("--timeout", type=float, default=8)
    parser.add_argument("--sensors-url", default=os.getenv("SENSORS_URL", "http://esp32sensores.local"))
    parser.add_argument("--sensors-timeout", type=float, default=3)
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    try:
        server = create_server(args.host, args.port, args.camera_url, args.timeout,
                               args.sensors_url, args.sensors_timeout)
    except (ValueError, OSError) as error:
        parser.error(str(error))
    print(f"Abre http://localhost:{server.server_port} | Cámara: {server.camera_url} | Sensores: {server.sensors_url}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
