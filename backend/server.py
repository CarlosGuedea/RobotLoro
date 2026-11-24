"""Backend de StudyBot Loro: cámara + sensores + modelo LorBot, y sirve el dashboard.

Inicio: python3 backend/server.py --camera-url http://esp32cam.local --api-url http://127.0.0.1:5055
"""

import argparse
import base64
import binascii
import io
import json
import logging
import math
import mimetypes
import os
import socket
import threading
import time
from collections import deque
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import parse_qs, urlsplit
from urllib.request import ProxyHandler, Request, build_opener

from PIL import Image, ImageOps, UnidentifiedImageError

if __package__:
    from . import lorbot
    from .sensors import fetch_readings
    from .store import EvaluationStore, place_id
else:
    import lorbot
    from sensors import fetch_readings
    from store import EvaluationStore, place_id

MAX_FRAME_BYTES = 2 * 1024 * 1024
MAX_BODY_BYTES = 12 * 1024 * 1024
MAX_UPLOAD_SIDE = 1600
FRESH_READING_S = 10
ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "frontend_new" / "dist"
DATA = ROOT / "data"


class RequestError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


def now_iso():
    return datetime.now(timezone.utc).isoformat()


MAX_AUDIO_AGE_MS = 10_000


def lan_address(target=None):
    """IP de esta computadora en la red local: la de la interfaz que llega a `target` (un ESP32).

    Si `target` no es una IP (nombre .local) o se alcanza por loopback (simulador local), usa la
    interfaz de la ruta por defecto.
    """
    try:
        socket.inet_aton(target or "")
        targets = [target, "10.255.255.255"]
    except OSError:
        targets = ["10.255.255.255"]
    for candidate in targets:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as probe:
            try:
                probe.connect((candidate, 80))  # UDP: no envía nada, solo elige la interfaz.
                address = probe.getsockname()[0]
            except OSError:
                continue
        if not address.startswith(("127.", "0.")):
            return address
    return None


def to_reading(raw, received_at):
    """Muestra del ESP32 → `SensorReading` del dashboard."""
    inmp441 = raw.get("sound_source") == "inmp441"
    dbfs = raw.get("sound_dbfs")
    if inmp441 and raw["sound_age_ms"] > MAX_AUDIO_AGE_MS:
        dbfs = None  # El micrófono dejó de entregar ventanas: no presentar el último nivel como actual.
    return {"timestamp": received_at, "temperatureC": raw["temperature_c"], "humidityPct": raw["humidity_pct"],
            "soundDetected": raw["sound_detected"], "soundDbfs": dbfs,
            "soundSource": "inmp441" if inmp441 else "digital",
            "soundOk": raw["sound_ok"] and dbfs is not None if inmp441 else None,
            "soundClipped": bool(raw.get("sound_clipped"))}


def average(values):
    values = [v for v in values if v is not None]
    return round(sum(values) / len(values), 1) if values else None


def microphone_status(reading):
    """Estado del sensor de sonido para el panel Dispositivo."""
    dbfs = reading["soundDbfs"]
    if reading["soundSource"] == "inmp441":
        if not reading["soundOk"]:
            return ("error", "El INMP441 no entrega audio: revisa SCK (GPIO26), WS (GPIO25) y SD (GPIO33). "
                             "Mientras, mide el ruido desde el dashboard.")
        if reading["soundClipped"]:
            return ("degradado", f"INMP441 · {dbfs} dBFS, saturado: el nivel real es mayor")
        return ("ok", f"INMP441 · {dbfs} dBFS")
    if dbfs is not None:
        return ("ok", f"{dbfs} dBFS")
    return ("degradado", "Detector digital: solo sí/no. Mide los dBFS desde el dashboard.")


class CaptureServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address, camera_url, timeout, sensors_url, sensors_timeout,
                 api_url, api_timeout, data_dir, frontend_dir):
        super().__init__(address, Handler)
        self.camera_url = camera_url.rstrip("/")
        self.camera_timeout = timeout
        self.sensors_url = sensors_url.rstrip("/")
        self.sensors_timeout = sensors_timeout
        self.api_url = api_url.rstrip("/")
        self.api_timeout = api_timeout
        self.frontend_dir = Path(frontend_dir).resolve()
        self.store = EvaluationStore(data_dir)
        self.capture_lock = threading.Lock()
        self.evaluation_lock = threading.Lock()
        self.state_lock = threading.Lock()
        self.latest = None
        self.captured_at = None
        self.capture_count = 0
        self.readings = deque(maxlen=1200)  # ~1 h con muestras cada 3 s.
        # El lanzador empaquetado lo pone en True mientras carga CLIP en segundo plano.
        self.model_loading = False
        self.settings_file = Path(data_dir) / "settings.json"
        self.load_settings()

    # --- Configuración ------------------------------------------------------------
    def settings(self):
        return {"cameraUrl": self.camera_url, "sensorsUrl": self.sensors_url}

    def load_settings(self):
        """Las direcciones guardadas desde el dashboard tienen prioridad sobre las de inicio."""
        try:
            saved = json.loads(self.settings_file.read_text(encoding="utf-8"))
            self.apply_settings(saved, save=False)
        except FileNotFoundError:
            pass
        except (ValueError, RequestError) as error:
            logging.warning("Ignorando %s inválido: %s", self.settings_file, error)

    def apply_settings(self, body, save=True):
        if not isinstance(body, dict):
            raise RequestError(400, "La configuración debe ser un objeto JSON.")
        camera = normalize_device_url(body.get("cameraUrl", self.camera_url), "cámara")
        sensors = normalize_device_url(body.get("sensorsUrl", self.sensors_url), "sensores")
        with self.state_lock:
            if sensors != self.sensors_url:
                self.readings.clear()  # Las lecturas anteriores eran de otra placa.
            self.camera_url, self.sensors_url = camera, sensors
        if save:
            temporary = self.settings_file.with_suffix(".tmp")
            temporary.write_text(json.dumps(self.settings(), indent=1), encoding="utf-8")
            os.replace(temporary, self.settings_file)
        return self.settings()

    # --- Sensores -----------------------------------------------------------------
    def read_sensors(self):
        """Consulta el ESP32 y guarda la muestra en el historial. Lanza excepción si falla."""
        reading = to_reading(fetch_readings(self.sensors_url, self.sensors_timeout), now_iso())
        with self.state_lock:
            self.readings.append((time.monotonic(), reading))
        return reading

    def current_reading(self):
        """Última muestra si tiene menos de 10 s; si no, consulta al ESP32. None si no responde."""
        with self.state_lock:
            if self.readings and time.monotonic() - self.readings[-1][0] < FRESH_READING_S:
                return self.readings[-1][1]
        try:
            return self.read_sensors()
        except Exception as error:
            logging.warning("Sensores no disponibles (%s): %s", self.sensors_url, error)
            return None

    def reading_history(self, minutes):
        """Promedio por minuto de las muestras recibidas, del más antiguo al más reciente."""
        with self.state_lock:
            samples = [reading for _, reading in self.readings]
        buckets = {}
        for reading in samples:
            buckets.setdefault(reading["timestamp"][:16], []).append(reading)
        history = []
        for minute in sorted(buckets)[-minutes:]:
            group = buckets[minute]
            history.append({"timestamp": f"{minute}:00+00:00",
                            "temperatureC": average(r["temperatureC"] for r in group),
                            "humidityPct": average(r["humidityPct"] for r in group),
                            "soundDetected": any(r["soundDetected"] for r in group),
                            "soundDbfs": average(r["soundDbfs"] for r in group),
                            "soundSource": group[-1]["soundSource"],
                            "soundOk": group[-1]["soundOk"],
                            "soundClipped": any(r["soundClipped"] for r in group)})
        return history

    def start_sampler(self, interval=3):
        def loop():
            while True:
                try:
                    self.read_sensors()
                except Exception as error:
                    logging.debug("Muestra de sensores fallida: %s", error)
                time.sleep(interval)
        threading.Thread(target=loop, name="sensores", daemon=True).start()

    # --- Cámara -------------------------------------------------------------------
    def capture_frame(self):
        """Pide una foto a la ESP32-CAM. Requiere `capture_lock`. Lanza excepción si falla."""
        # Sin proxies del sistema: la cámara se consulta directamente en la LAN.
        request = Request(self.camera_url + "/capture", headers={"Accept": "image/jpeg"})
        with build_opener(ProxyHandler({})).open(request, timeout=self.camera_timeout) as response:
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
        captured_at = now_iso()
        with self.state_lock:
            self.latest = data
            self.captured_at = captured_at
            self.capture_count += 1
        return data, captured_at

    def camera_health(self):
        if self.capture_lock.locked():
            return "ok", "Tomando una foto…"
        try:
            with build_opener(ProxyHandler({})).open(Request(self.camera_url + "/health"), timeout=2):
                return "ok", self.camera_url
        except HTTPError as error:
            return ("degradado" if error.code == 503 else "error"), "La OV2640 no inició; revisa el monitor serie."
        except OSError:
            return "error", f"Sin respuesta en {self.camera_url}"

    def network(self):
        """Si el dashboard se puede abrir desde otros equipos de la red, y con qué dirección."""
        shared = self.server_address[0] in ("0.0.0.0", "", "::")
        address = lan_address(urlsplit(self.sensors_url).hostname) if shared else None
        return {"shared": shared, "port": self.server_port,
                "url": f"http://{address}:{self.server_port}" if address else None}

    # --- Estado general -----------------------------------------------------------
    def device_status(self):
        with ThreadPoolExecutor(max_workers=3) as pool:
            camera = pool.submit(self.camera_health)
            reading = pool.submit(self.current_reading)
            model = pool.submit(lambda: not self.model_loading and lorbot.healthy(self.api_url))
            (camera_health, camera_detail), reading, model_ok = camera.result(), reading.result(), model.result()

        if reading is None:
            temperature = ("error", f"ESP32 de sensores sin respuesta en {self.sensors_url}")
            sound = ("error", "ESP32 de sensores sin respuesta")
        else:
            temperature = (("ok", f"{reading['temperatureC']} °C · {reading['humidityPct']} % HR")
                           if reading["temperatureC"] is not None else ("degradado", "El DHT22 no entrega lectura."))
            sound = microphone_status(reading)
        components = [
            ("camera", "Cámara ESP32-CAM", (camera_health, camera_detail)),
            ("temperature", "Sensor DHT22", temperature),
            ("microphone", "Sensor de sonido", sound),
            ("model", "Modelo LorBot", ("ok", self.api_url) if model_ok else
             ("degradado", "Cargando el modelo, espera unos segundos…") if self.model_loading else
             ("error", f"Sin respuesta en {self.api_url}")),
        ]
        return {"online": camera_health != "error" or reading is not None,
                "name": "StudyBot Loro",
                "lastSeen": reading["timestamp"] if reading else None,
                "components": [{"key": key, "label": label, "health": health, "detail": detail}
                               for key, label, (health, detail) in components]}

    # --- Evaluación ---------------------------------------------------------------
    def evaluate(self, body):
        name = body.get("placeName")
        if not isinstance(name, str) or not name.strip() or len(name.strip()) > 120:
            raise RequestError(400, "Escribe el nombre del lugar (máximo 120 caracteres).")
        notes = body.get("notes") or ""
        if not isinstance(notes, str) or len(notes.strip()) > 200:
            raise RequestError(400, "La referencia admite máximo 200 caracteres.")
        temperature = number(body, "temperatureC", -40, 80)
        sound = number(body, "soundDbfs", -120, 0)
        sound_source = body.get("soundSource", "manual")
        if sound_source not in ("manual", "microfono"):
            raise RequestError(400, "soundSource debe ser 'manual' o 'microfono'.")
        upload = decode_photo(body.get("photo"))

        if not self.evaluation_lock.acquire(blocking=False):
            raise RequestError(409, "Ya hay una evaluación en curso. Intenta de nuevo.")
        try:
            sources = {"temperatura": "manual", "ruido": sound_source}
            if temperature is None or sound is None:
                reading = self.current_reading()
                if temperature is None and reading and reading["temperatureC"] is not None:
                    temperature, sources["temperatura"] = reading["temperatureC"], "sensor"
                if sound is None and reading and reading["soundDbfs"] is not None:
                    sound, sources["ruido"] = reading["soundDbfs"], "sensor"
            if self.model_loading:
                raise RequestError(503, "El modelo LorBot todavía está cargando. Intenta en unos segundos.")
            if temperature is None:
                raise RequestError(422, "No hay lectura de temperatura del DHT22. Escríbela manualmente.")
            if sound is None:
                raise RequestError(422, "Falta el ruido en dBFS: mídelo con el micrófono o escríbelo.")

            if upload is not None:
                jpeg, photo_source = upload, "subida"
            else:
                if not self.capture_lock.acquire(blocking=False):
                    raise RequestError(409, "Ya hay una captura en curso. Intenta de nuevo.")
                try:
                    jpeg, _ = self.capture_frame()
                except Exception as error:
                    logging.warning("Captura fallida (%s): %s", self.camera_url, error)
                    raise RequestError(502, "No se pudo tomar la foto con la ESP32-CAM. Revisa su alimentación y red, o sube una foto.") from error
                finally:
                    self.capture_lock.release()
                photo_source = "camara"

            try:
                verdict = lorbot.predict(self.api_url, jpeg, temperature, sound, self.api_timeout)
            except lorbot.LorBotError as error:
                logging.warning("LorBot (%s): %s", self.api_url, error)
                raise RequestError(502, str(error)) from error

            evaluation_id = self.store.new_id()
            evaluation = {"id": evaluation_id, "placeId": place_id(name), "placeName": name.strip(),
                          "createdAt": now_iso(), "verdict": verdict,
                          "photoUrl": f"/api/photos/{evaluation_id}.jpg", "photoSource": photo_source,
                          "variables": [{"key": "temperatura", "value": temperature, "source": sources["temperatura"]},
                                        {"key": "ruido", "value": sound, "source": sources["ruido"]}]}
            if notes.strip():
                evaluation["notes"] = notes.strip()
            return self.store.add(evaluation, jpeg)
        finally:
            self.evaluation_lock.release()


def number(body, field, low, high):
    value = body.get(field)
    if value is None:
        return None
    if type(value) not in (int, float) or not math.isfinite(value) or not low <= value <= high:
        raise RequestError(400, f"{field} debe ser un número entre {low} y {high}.")
    return round(float(value), 2)


def normalize_device_url(value, name):
    """Acepta «192.168.1.50», «esp32cam.local» o «http://192.168.1.50/» → «http://192.168.1.50»."""
    if not isinstance(value, str) or not value.strip():
        raise RequestError(400, f"Escribe la dirección de {name}.")
    url = value.strip()
    if "://" not in url:
        url = "http://" + url
    try:
        validate_device_url(url)
    except ValueError as error:
        raise RequestError(400, f"Dirección de {name} inválida. {error}") from error
    return url.rstrip("/")


def decode_photo(value):
    """Foto subida desde el navegador (data URL) → JPEG normalizado, o None si no hay."""
    if value is None:
        return None
    if not isinstance(value, str) or not value.startswith("data:image/") or "," not in value:
        raise RequestError(400, "La foto debe enviarse como data URL de imagen.")
    try:
        raw = base64.b64decode(value.split(",", 1)[1], validate=True)
        with Image.open(io.BytesIO(raw)) as source:
            if source.width * source.height > 40_000_000:
                raise ValueError("Imagen demasiado grande.")
            image = ImageOps.exif_transpose(source).convert("RGB")
        image.thumbnail((MAX_UPLOAD_SIDE, MAX_UPLOAD_SIDE))
        output = io.BytesIO()
        image.save(output, "JPEG", quality=88)
        return output.getvalue()
    except (binascii.Error, UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as error:
        raise RequestError(400, "La foto no es una imagen válida (JPG, PNG o WebP).") from error


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
        url = urlsplit(self.path)
        path, query = url.path, parse_qs(url.query)
        server = self.server
        if path == "/api/status":
            with server.state_lock:
                state = {"camera_url": server.camera_url, "capture_count": server.capture_count,
                         "captured_at": server.captured_at, "has_image": server.latest is not None,
                         "sensors_url": server.sensors_url, "api_url": server.api_url}
            self.json(200, state)
        elif path == "/api/sensors":
            try:
                reading = fetch_readings(server.sensors_url, server.sensors_timeout)
                self.json(200, {"online": True, "readings": reading, "received_at": now_iso()})
            except Exception as error:
                logging.warning("Sensores no disponibles (%s): %s", server.sensors_url, error)
                self.json(502, {"online": False, "readings": None, "received_at": None,
                                "error": "No hay una lectura válida del ESP32. Revisa su alimentación y conexión Wi-Fi."})
        elif path == "/api/sensors/latest":
            reading = server.current_reading()
            if reading is None:
                self.json(503, {"error": "No hay una lectura válida del ESP32 de sensores."})
            else:
                self.json(200, reading)
        elif path == "/api/sensors/history":
            limit = query.get("limit", ["30"])[0]
            self.json(200, server.reading_history(int(limit) if limit.isdigit() else 30))
        elif path == "/api/settings":
            self.json(200, server.settings())
        elif path == "/api/network":
            self.json(200, server.network())
        elif path == "/api/device/status":
            self.json(200, server.device_status())
        elif path == "/api/evaluations":
            self.json(200, server.store.evaluations(query.get("placeId", [None])[0]))
        elif path == "/api/places":
            self.json(200, server.store.places())
        elif path.startswith("/api/photos/") and path.endswith(".jpg"):
            data = server.store.photo(path[len("/api/photos/"):-len(".jpg")])
            if data is None:
                self.json(404, {"error": "Foto no encontrada."})
            else:
                self.respond(200, data, "image/jpeg")
        elif path == "/api/latest.jpg":
            with server.state_lock:
                data, captured_at = server.latest, server.captured_at
            if data is None:
                self.json(404, {"error": "Todavía no se ha tomado una foto."})
            else:
                self.respond(200, data, "image/jpeg", {"X-Captured-At": captured_at})
        elif path == "/api/capture":
            self.respond(405, b'{"error":"Usa POST para tomar una foto."}', headers={"Allow": "POST"})
        elif path.startswith("/api/"):
            self.json(404, {"error": "Ruta no encontrada."})
        else:
            self.static(path)

    def static(self, path):
        """Archivos del dashboard compilado; cualquier otra ruta devuelve index.html (SPA)."""
        root = self.server.frontend_dir
        candidate = (root / path.lstrip("/")).resolve()
        if not candidate.is_relative_to(root) or not candidate.is_file():
            candidate = root / "index.html"
        try:
            data = candidate.read_bytes()
        except FileNotFoundError:
            self.json(503, {"error": "Dashboard sin compilar. Ejecuta: npm --prefix frontend_new run build"})
            return
        mime = mimetypes.guess_type(candidate.name)[0] or "application/octet-stream"
        if mime.startswith("text/") or mime in ("application/javascript", "image/svg+xml"):
            mime += "; charset=utf-8"
        self.respond(200, data, mime)

    def read_json(self):
        # Exigir JSON evita que otra página web haga peticiones «simples» (text/plain) al loro.
        if self.headers.get_content_type() != "application/json":
            raise RequestError(415, "Envía el cuerpo como application/json.")
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = -1
        if length < 0 or length > MAX_BODY_BYTES:
            raise RequestError(413, "La petición supera el límite de 12 MiB.")
        try:
            body = json.loads(self.rfile.read(length) or b"{}")
        except (ValueError, OSError) as error:
            raise RequestError(400, "El cuerpo debe ser JSON válido.") from error
        if not isinstance(body, dict):
            raise RequestError(400, "El cuerpo debe ser un objeto JSON.")
        return body

    def do_POST(self):
        path = urlsplit(self.path).path
        if path == "/api/evaluations":
            try:
                self.json(201, self.server.evaluate(self.read_json()))
            except RequestError as error:
                self.json(error.status, {"error": str(error)})
        elif path == "/api/capture":
            self.capture()
        else:
            self.json(404, {"error": "Ruta no encontrada."})

    def do_PUT(self):
        if urlsplit(self.path).path != "/api/settings":
            self.json(404, {"error": "Ruta no encontrada."})
            return
        try:
            self.json(200, self.server.apply_settings(self.read_json()))
        except RequestError as error:
            self.json(error.status, {"error": str(error)})

    def capture(self):
        if not self.server.capture_lock.acquire(blocking=False):
            self.json(409, {"error": "Ya hay una captura en curso. Intenta de nuevo."})
            return
        try:
            data, captured_at = self.server.capture_frame()
            self.respond(200, data, "image/jpeg", {"X-Captured-At": captured_at})
        except Exception as error:
            logging.warning("Captura fallida (%s): %s", self.server.camera_url, error)
            self.json(502, {"error": "No se pudo obtener la foto. Revisa la alimentación, la red y la dirección de la cámara."})
        finally:
            self.server.capture_lock.release()

    def log_message(self, fmt, *args):
        logging.info("%s %s", self.client_address[0], fmt % args)


def validate_device_url(url, example="http://192.168.1.50"):
    parsed = urlsplit(url)
    if (parsed.scheme != "http" or not parsed.hostname or parsed.username or parsed.password
            or parsed.path not in ("", "/") or parsed.query or parsed.fragment):
        raise ValueError(f"Usa una dirección base HTTP, por ejemplo {example}")


def create_server(host="127.0.0.1", port=8000, camera_url="http://esp32cam.local", timeout=8,
                  sensors_url="http://esp32sensores.local", sensors_timeout=3,
                  api_url="http://127.0.0.1:5055", api_timeout=60, data_dir=DATA, frontend_dir=FRONTEND):
    validate_device_url(camera_url, "http://esp32cam.local o http://192.168.1.50")
    validate_device_url(sensors_url)
    validate_device_url(api_url, "http://127.0.0.1:5055")
    if timeout <= 0 or sensors_timeout <= 0 or api_timeout <= 0:
        raise ValueError("El timeout debe ser positivo.")
    return CaptureServer((host, port), camera_url, timeout, sensors_url, sensors_timeout,
                         api_url, api_timeout, data_dir, frontend_dir)


def main():
    parser = argparse.ArgumentParser(description="StudyBot Loro: ESP32-CAM + sensores + modelo LorBot")
    parser.add_argument("--host", default="127.0.0.1", help="0.0.0.0 para abrirlo desde otros equipos de la red")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--camera-url", default=os.getenv("CAMERA_URL", "http://esp32cam.local"))
    parser.add_argument("--timeout", type=float, default=8)
    parser.add_argument("--sensors-url", default=os.getenv("SENSORS_URL", "http://esp32sensores.local"))
    parser.add_argument("--sensors-timeout", type=float, default=3)
    parser.add_argument("--api-url", default=os.getenv("LORBOT_URL", "http://127.0.0.1:5055"))
    parser.add_argument("--api-timeout", type=float, default=60)
    parser.add_argument("--data-dir", default=os.getenv("LORO_DATA_DIR", str(DATA)))
    parser.add_argument("--frontend-dir", default=str(FRONTEND))
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    try:
        server = create_server(args.host, args.port, args.camera_url, args.timeout, args.sensors_url,
                               args.sensors_timeout, args.api_url, args.api_timeout, args.data_dir, args.frontend_dir)
    except (ValueError, OSError) as error:
        parser.error(str(error))
    server.start_sampler()
    if not (server.frontend_dir / "index.html").is_file():
        print("Aviso: el dashboard no está compilado; ejecuta npm --prefix frontend_new run build", flush=True)
    print(f"Abre http://localhost:{server.server_port} | Cámara: {server.camera_url} | "
          f"Sensores: {server.sensors_url} | LorBot: {server.api_url}", flush=True)
    if server.network()["url"]:
        print(f"Desde otros equipos de la red: {server.network()['url']}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
