import base64
import io
import json
import tempfile
import threading
import unittest
from email.parser import BytesParser
from email.policy import HTTP
from pathlib import Path
from unittest.mock import patch
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from PIL import Image
from backend.server import create_server, MAX_FRAME_BYTES

buffer = io.BytesIO()
Image.new("RGB", (32, 24), (24, 100, 70)).save(buffer, "JPEG")
JPEG = buffer.getvalue()


class Camera(BaseHTTPRequestHandler):
    def do_GET(self):
        self.server.hits.append(self.path)
        status, mime, data = self.server.reply
        self.send_response(status)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        try:
            self.wfile.write(data)
        except (BrokenPipeError, ConnectionResetError):
            pass  # El receptor cierra las respuestas demasiado grandes.

    def log_message(self, *args):
        pass


class CaptureTests(unittest.TestCase):
    def setUp(self):
        self.camera = ThreadingHTTPServer(("127.0.0.1", 0), Camera)
        self.camera.reply = (200, "image/jpeg", JPEG)
        self.camera.hits = []
        self.camera_thread = threading.Thread(target=self.camera.serve_forever, daemon=True)
        self.camera_thread.start()
        self.tmp = tempfile.TemporaryDirectory()
        frontend = Path(self.tmp.name, "dist")
        (frontend / "assets").mkdir(parents=True)
        (frontend / "index.html").write_text("<!doctype html><title>Dashboard</title>")
        (frontend / "assets" / "app.js").write_text("console.log(1)")
        self.app = create_server("127.0.0.1", 0, f"http://127.0.0.1:{self.camera.server_port}", timeout=0.5,
                                 data_dir=Path(self.tmp.name, "data"), frontend_dir=frontend)
        self.app.sensors_url = f"http://127.0.0.1:{self.camera.server_port}"
        self.app.sensors_timeout = 0.5
        self.thread = threading.Thread(target=self.app.serve_forever, daemon=True)
        self.thread.start()
        self.base = f"http://127.0.0.1:{self.app.server_port}"

    def tearDown(self):
        for server, thread in [(self.app, self.thread), (self.camera, self.camera_thread)]:
            server.shutdown()
            server.server_close()
            thread.join()
        self.tmp.cleanup()

    def fetch(self, path, method="GET", timeout=3):
        req = Request(self.base + path, method=method, data=b"" if method == "POST" else None)
        try:
            with urlopen(req, timeout=timeout) as response:
                return response.status, response.headers, response.read()
        except HTTPError as error:
            return error.code, error.headers, error.read()

    def test_no_automatic_capture_and_latest_starts_empty(self):
        self.assertEqual(self.fetch("/api/latest.jpg")[0], 404)
        self.assertEqual(self.camera.hits, [])

    def test_capture_returns_jpeg_and_updates_latest(self):
        status, headers, data = self.fetch("/api/capture", "POST")
        self.assertEqual(status, 200)
        self.assertEqual(headers["Content-Type"], "image/jpeg")
        self.assertTrue(headers["X-Captured-At"])
        self.assertEqual(data, JPEG)
        self.assertEqual(self.camera.hits, ["/capture"])
        self.assertEqual(self.fetch("/api/latest.jpg")[2], JPEG)
        state = json.loads(self.fetch("/api/status")[2])
        self.assertEqual(state["capture_count"], 1)

    def test_invalid_image_does_not_replace_previous_capture(self):
        self.fetch("/api/capture", "POST")
        self.camera.reply = (200, "image/jpeg", b"not a jpeg")
        self.assertEqual(self.fetch("/api/capture", "POST")[0], 502)
        self.assertEqual(self.fetch("/api/latest.jpg")[2], JPEG)

    def test_truncated_jpeg_is_rejected(self):
        self.camera.reply = (200, "image/jpeg", JPEG[:-20])
        self.assertEqual(self.fetch("/api/capture", "POST")[0], 502)

    def test_wrong_content_type_is_rejected(self):
        self.camera.reply = (200, "text/html", JPEG)
        self.assertEqual(self.fetch("/api/capture", "POST")[0], 502)

    def test_oversize_frame_is_rejected(self):
        self.camera.reply = (200, "image/jpeg", b"x" * (MAX_FRAME_BYTES + 1))
        self.assertEqual(self.fetch("/api/capture", "POST")[0], 502)

    def test_camera_error_is_reported_as_json(self):
        self.camera.reply = (503, "text/plain", b"no camera")
        status, headers, data = self.fetch("/api/capture", "POST")
        self.assertEqual(status, 502)
        self.assertIn("error", json.loads(data))

    def test_disconnected_camera_times_out(self):
        self.camera.shutdown()
        self.camera_thread.join()
        self.assertEqual(self.fetch("/api/capture", "POST")[0], 502)

    def test_frontend_and_routes(self):
        status, headers, data = self.fetch("/")
        self.assertEqual(status, 200)
        self.assertIn(b"Dashboard", data)
        status, headers, _ = self.fetch("/assets/app.js")
        self.assertEqual(status, 200)
        self.assertIn("javascript", headers["Content-Type"])
        self.assertEqual(self.fetch("/api/capture")[0], 405)
        # Rutas del SPA y rutas fuera de dist devuelven index.html, nunca archivos del backend.
        self.assertIn(b"Dashboard", self.fetch("/historial")[2])
        self.assertIn(b"Dashboard", self.fetch("/../backend/server.py")[2])
        self.assertIn(b"Dashboard", self.fetch("/%2e%2e/%2e%2e/backend/server.py")[2])
        self.assertEqual(self.fetch("/api/missing")[0], 404)
        self.assertEqual(self.fetch("/api/photos/../evaluations.json.jpg")[0], 404)

    def sensor_reply(self, **changes):
        reading = {"temperature_c": 24.5, "humidity_pct": 50.2, "dht_ok": True,
                   "sound_detected": False, "sound_level": 1,
                   "sample_age_ms": 100, "uptime_ms": 12000, "sound_activity_count": 0}
        reading.update(changes)
        self.camera.reply = (200, "application/json", json.dumps(reading).encode())

    def test_sensor_reading_reaches_frontend_api(self):
        self.sensor_reply()
        status, _, data = self.fetch("/api/sensors")
        self.assertEqual(status, 200)
        result = json.loads(data)
        self.assertTrue(result["online"])
        self.assertEqual(result["readings"]["temperature_c"], 24.5)
        self.assertFalse(result["readings"]["sound_detected"])
        self.assertTrue(result["received_at"])
        self.assertEqual(self.camera.hits, ["/readings"])

    def test_sound_activity_survives_overwritten_positive_sample(self):
        self.sensor_reply(sound_detected=False, sound_activity_count=3)
        status, _, data = self.fetch("/api/sensors")
        self.assertEqual(status, 200)
        reading = json.loads(data)["readings"]
        self.assertIn("sound_activity_count", reading)
        self.assertEqual(reading["sound_activity_count"], 3)

    def test_local_sensor_name_uses_ipv4_resolution(self):
        self.sensor_reply()
        self.app.sensors_url = f"http://test-loro-sensors.local:{self.camera.server_port}"
        with patch("socket.gethostbyname", return_value="127.0.0.1") as resolve:
            status, _, _ = self.fetch("/api/sensors", timeout=10)
        self.assertEqual(status, 200)
        resolve.assert_called_with("test-loro-sensors.local")

    def test_dht_failure_keeps_sound_but_no_temperature(self):
        self.sensor_reply(dht_ok=False, temperature_c=None, humidity_pct=None, sound_detected=True)
        status, _, data = self.fetch("/api/sensors")
        self.assertEqual(status, 200)
        reading = json.loads(data)["readings"]
        self.assertIsNone(reading["temperature_c"])
        self.assertTrue(reading["sound_detected"])

    def test_invalid_sensor_data_is_not_displayed_as_live(self):
        for changes in [{"humidity_pct": 101}, {"temperature_c": float("nan")},
                        {"sound_detected": "false"}, {"temperature_c": True},
                        {"dht_ok": False}]:
            with self.subTest(changes=changes):
                self.sensor_reply(**changes)
                status, _, data = self.fetch("/api/sensors")
                self.assertEqual(status, 502)
                self.assertFalse(json.loads(data)["online"])
                self.assertIsNone(json.loads(data)["readings"])

    def test_sensor_disconnect_is_reported_without_old_data(self):
        self.sensor_reply()
        self.fetch("/api/sensors")
        self.camera.reply = (503, "text/plain", b"offline")
        status, _, data = self.fetch("/api/sensors")
        self.assertEqual(status, 502)
        self.assertIsNone(json.loads(data)["readings"])

    def test_malformed_sensor_json_is_rejected(self):
        self.camera.reply = (200, "application/json", b'{"temperature_c":')
        self.assertEqual(self.fetch("/api/sensors")[0], 502)

    def test_inmp441_metrics_are_received(self):
        self.sensor_reply(sound_source="inmp441", sound_level=None, sound_ok=True,
                          sound_rms=0.01, sound_dbfs=-40.0, sound_peak_dbfs=-30.0,
                          sound_threshold_dbfs=-35.0, sound_clipped=False, sound_age_ms=100)
        status, _, data = self.fetch("/api/sensors")
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(data)["readings"]["sound_dbfs"], -40.0)

    def test_inmp441_failure_preserves_dht(self):
        self.sensor_reply(sound_source="inmp441", sound_level=None, sound_ok=False,
                          sound_rms=None, sound_dbfs=None, sound_peak_dbfs=None,
                          sound_threshold_dbfs=-35.0, sound_clipped=False, sound_age_ms=100)
        status, _, data = self.fetch("/api/sensors")
        self.assertEqual(status, 200)
        self.assertFalse(json.loads(data)["readings"]["sound_ok"])
        self.assertEqual(json.loads(data)["readings"]["temperature_c"], 24.5)


class Hardware(BaseHTTPRequestHandler):
    """Cámara y sensores en un solo servidor, con respuestas por ruta."""
    def do_GET(self):
        self.server.hits.append(self.path)
        status, mime, data = self.server.routes.get(self.path, (404, "text/plain", b"no"))
        self.send_response(status)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *args):
        pass


class LorBotApi(BaseHTTPRequestHandler):
    def do_GET(self):
        self.reply(200, {"status": "ok"})

    def do_POST(self):
        body = self.rfile.read(int(self.headers["Content-Length"]))
        message = BytesParser(policy=HTTP).parsebytes(
            f"Content-Type: {self.headers['Content-Type']}\r\n\r\n".encode() + body)
        fields = {part.get_param("name", header="content-disposition"): part.get_payload(decode=True)
                  for part in message.iter_parts()}
        self.server.requests.append(fields)
        self.reply(*self.server.reply)

    def reply(self, status, value):
        data = json.dumps(value).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *args):
        pass


def png_data_url():
    buffer = io.BytesIO()
    Image.new("RGB", (40, 30), (200, 10, 10)).save(buffer, "PNG")
    return "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode()


class EvaluationTests(unittest.TestCase):
    def setUp(self):
        self.servers = []
        self.hardware = self.start(Hardware)
        self.hardware.hits = []
        self.hardware.routes = {}
        self.sensors(temperature_c=30.5)
        self.hardware.routes["/capture"] = (200, "image/jpeg", JPEG)
        self.hardware.routes["/health"] = (200, "application/json", b'{"camera_ready":true}')
        self.model = self.start(LorBotApi)
        self.model.requests = []
        self.model.reply = (200, {"prediction": "Apto", "temperature_c": 0, "sound_dbfs": 0})
        self.tmp = tempfile.TemporaryDirectory()
        hardware = f"http://127.0.0.1:{self.hardware.server_port}"
        self.app = create_server("127.0.0.1", 0, hardware, 0.5, hardware, 0.5,
                                 f"http://127.0.0.1:{self.model.server_port}", 5,
                                 Path(self.tmp.name, "data"), Path(self.tmp.name, "dist"))
        self.servers.append((self.app, threading.Thread(target=self.app.serve_forever, daemon=True)))
        self.servers[-1][1].start()
        self.base = f"http://127.0.0.1:{self.app.server_port}"

    def start(self, handler):
        server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        self.servers.append((server, thread))
        return server

    def tearDown(self):
        for server, thread in self.servers:
            server.shutdown()
            server.server_close()
            thread.join()
        self.tmp.cleanup()

    def sensors(self, **changes):
        reading = {"temperature_c": 24.5, "humidity_pct": 50.2, "dht_ok": True, "sound_detected": False,
                   "sound_level": 1, "sample_age_ms": 100, "uptime_ms": 12000, "sound_activity_count": 0}
        reading.update(changes)
        self.hardware.routes["/readings"] = (200, "application/json", json.dumps(reading).encode())

    def call(self, path, body=None, method=None, content_type="application/json"):
        data = None if body is None else json.dumps(body).encode()
        req = Request(self.base + path, data=data, method=method or ("POST" if data else "GET"),
                      headers={"Content-Type": content_type})
        try:
            with urlopen(req, timeout=10) as response:
                raw = response.read()
                return response.status, (json.loads(raw) if "json" in response.headers["Content-Type"] else raw)
        except HTTPError as error:
            return error.code, json.loads(error.read())

    def test_evaluation_uses_camera_sensor_temperature_and_given_noise(self):
        status, evaluation = self.call("/api/evaluations", {"placeName": "  Biblioteca Central ",
                                                             "notes": "Sala 2", "soundDbfs": -31.5,
                                                             "soundSource": "microfono"})
        self.assertEqual(status, 201)
        self.assertEqual(evaluation["verdict"], "apto")
        self.assertEqual(evaluation["placeId"], "biblioteca-central")
        self.assertEqual(evaluation["placeName"], "Biblioteca Central")
        self.assertEqual(evaluation["photoSource"], "camara")
        self.assertEqual(evaluation["variables"], [
            {"key": "temperatura", "value": 30.5, "source": "sensor"},
            {"key": "ruido", "value": -31.5, "source": "microfono"}])
        sent = self.model.requests[0]
        self.assertEqual(sent["image"], JPEG)
        self.assertEqual(float(sent["temperature_c"]), 30.5)
        self.assertEqual(float(sent["sound_dbfs"]), -31.5)
        self.assertIn("/capture", self.hardware.hits)
        # Queda en el historial, agrupado por lugar, con su foto.
        self.assertEqual(self.call(evaluation["photoUrl"]), (200, JPEG))
        self.assertEqual(self.call("/api/evaluations")[1], [evaluation])
        self.assertEqual(self.call("/api/evaluations?placeId=otro")[1], [])
        self.call("/api/evaluations", {"placeName": "biblioteca CENTRAL", "soundDbfs": -30})
        places = self.call("/api/places")[1]
        self.assertEqual(len(places), 1)
        self.assertEqual(places[0]["evaluationsCount"], 2)

    def test_no_apto_from_model_and_sensor_dbfs(self):
        self.model.reply = (200, {"prediction": "No apto"})
        self.sensors(sound_dbfs=-18.25)
        status, evaluation = self.call("/api/evaluations", {"placeName": "Cafetería", "temperatureC": 33})
        self.assertEqual(status, 201)
        self.assertEqual(evaluation["verdict"], "no_apto")
        self.assertEqual(evaluation["variables"], [
            {"key": "temperatura", "value": 33.0, "source": "manual"},
            {"key": "ruido", "value": -18.25, "source": "sensor"}])

    def inmp441(self, **changes):
        audio = dict(sound_source="inmp441", sound_level=None, sound_ok=True, sound_rms=0.05,
                     sound_dbfs=-26.0, sound_peak_dbfs=-17.0, sound_threshold_dbfs=-35.0,
                     sound_clipped=False, sound_age_ms=40)
        audio.update(changes)
        self.sensors(**audio)

    def microphone(self):
        return next(c for c in self.call("/api/device/status")[1]["components"] if c["key"] == "microphone")

    def test_inmp441_dbfs_is_used_for_the_evaluation(self):
        self.inmp441(sound_dbfs=-26.5)
        status, evaluation = self.call("/api/evaluations", {"placeName": "Sala de lectura"})
        self.assertEqual(status, 201)
        self.assertEqual(evaluation["variables"], [
            {"key": "temperatura", "value": 24.5, "source": "sensor"},
            {"key": "ruido", "value": -26.5, "source": "sensor"}])
        sent = self.model.requests[-1]
        self.assertEqual(float(sent["sound_dbfs"]), -26.5)
        latest = self.call("/api/sensors/latest")[1]
        self.assertEqual((latest["soundSource"], latest["soundOk"], latest["soundDbfs"]), ("inmp441", True, -26.5))
        self.assertEqual(self.microphone()["health"], "ok")

    def test_inmp441_failure_keeps_temperature_and_asks_for_noise(self):
        self.inmp441(sound_ok=False, sound_rms=None, sound_dbfs=None, sound_peak_dbfs=None)
        latest = self.call("/api/sensors/latest")[1]
        self.assertEqual((latest["temperatureC"], latest["soundDbfs"], latest["soundOk"]), (24.5, None, False))
        self.assertEqual(self.microphone()["health"], "error")
        status, body = self.call("/api/evaluations", {"placeName": "Sala de lectura"})
        self.assertEqual(status, 422)
        self.assertIn("dBFS", body["error"])

    def test_inmp441_stale_or_clipped_audio(self):
        self.inmp441(sound_age_ms=60_000)
        self.assertEqual(self.call("/api/sensors/latest")[1]["soundDbfs"], None)
        self.assertEqual(self.microphone()["health"], "error")
        self.app.readings.clear()
        self.inmp441(sound_dbfs=-0.5, sound_peak_dbfs=0.0, sound_clipped=True)
        self.assertEqual(self.microphone()["health"], "degradado")

    def test_uploaded_photo_skips_camera_and_is_converted_to_jpeg(self):
        status, evaluation = self.call("/api/evaluations", {"placeName": "Jardín", "soundDbfs": -20,
                                                             "photo": png_data_url()})
        self.assertEqual(status, 201)
        self.assertEqual(evaluation["photoSource"], "subida")
        self.assertNotIn("/capture", self.hardware.hits)
        self.assertEqual(Image.open(io.BytesIO(self.model.requests[0]["image"])).format, "JPEG")

    def test_missing_measurements_are_reported_before_capturing(self):
        status, body = self.call("/api/evaluations", {"placeName": "Aula"})
        self.assertEqual(status, 422)
        self.assertIn("dBFS", body["error"])
        self.sensors(dht_ok=False, temperature_c=None, humidity_pct=None)
        self.app.readings.clear()
        status, body = self.call("/api/evaluations", {"placeName": "Aula", "soundDbfs": -20})
        self.assertEqual(status, 422)
        self.assertIn("temperatura", body["error"])
        self.assertNotIn("/capture", self.hardware.hits)
        self.assertEqual(self.model.requests, [])

    def test_invalid_input_is_rejected(self):
        for body in [{"placeName": ""}, {"placeName": "x" * 121}, {"placeName": "A", "soundDbfs": 5},
                     {"placeName": "A", "temperatureC": True}, {"placeName": "A", "photo": "data:image/png;base64,AAAA"},
                     {"placeName": "A", "soundSource": "otro"}]:
            with self.subTest(body=body):
                self.assertEqual(self.call("/api/evaluations", body)[0], 400)
        self.assertEqual(self.call("/api/evaluations"), (200, []))

    def test_model_and_camera_failures_are_502_and_not_saved(self):
        self.model.reply = (400, {"error": "Envía una imagen válida."})
        status, body = self.call("/api/evaluations", {"placeName": "Aula", "soundDbfs": -20})
        self.assertEqual((status, body["error"]), (502, "Envía una imagen válida."))
        self.hardware.routes["/capture"] = (503, "text/plain", b"no")
        self.assertEqual(self.call("/api/evaluations", {"placeName": "Aula", "soundDbfs": -20})[0], 502)
        self.assertEqual(self.call("/api/evaluations")[1], [])

    def test_history_survives_restart(self):
        self.call("/api/evaluations", {"placeName": "Aula", "soundDbfs": -20})
        from backend.store import EvaluationStore
        self.assertEqual(len(EvaluationStore(Path(self.tmp.name, "data")).evaluations()), 1)

    def test_device_status_and_sensor_endpoints(self):
        status, device = self.call("/api/device/status")
        self.assertEqual(status, 200)
        self.assertTrue(device["online"])
        health = {c["key"]: c["health"] for c in device["components"]}
        self.assertEqual(health, {"camera": "ok", "temperature": "ok", "microphone": "degradado", "model": "ok"})
        status, latest = self.call("/api/sensors/latest")
        self.assertEqual((status, latest["temperatureC"], latest["soundDbfs"]), (200, 30.5, None))
        history = self.call("/api/sensors/history?limit=30")[1]
        self.assertEqual(len(history), 1)
        self.assertEqual(history[0]["temperatureC"], 30.5)
        self.model.shutdown()
        self.hardware.routes["/health"] = (503, "application/json", b'{"camera_ready":false}')
        health = {c["key"]: c["health"] for c in self.call("/api/device/status")[1]["components"]}
        self.assertEqual((health["camera"], health["model"]), ("degradado", "error"))

    def test_settings_are_saved_normalized_and_reloaded(self):
        hardware = f"http://127.0.0.1:{self.hardware.server_port}"
        self.assertEqual(self.call("/api/settings")[1], {"cameraUrl": hardware, "sensorsUrl": hardware})
        status, saved = self.call("/api/settings", {"cameraUrl": " 192.168.1.50/ ", "sensorsUrl": "esp32sensores.local"}, "PUT")
        self.assertEqual((status, saved), (200, {"cameraUrl": "http://192.168.1.50",
                                                 "sensorsUrl": "http://esp32sensores.local"}))
        self.assertEqual(self.app.camera_url, "http://192.168.1.50")
        again = create_server("127.0.0.1", 0, "http://otro.local", 1, "http://otro.local", 1,
                              data_dir=Path(self.tmp.name, "data"), frontend_dir=Path(self.tmp.name, "dist"))
        self.assertEqual(again.settings(), saved)
        again.server_close()
        for body in [{"cameraUrl": ""}, {"cameraUrl": "ftp://x"}, {"sensorsUrl": "http://x/readings"}, []]:
            with self.subTest(body=body):
                self.assertEqual(self.call("/api/settings", body, "PUT")[0], 400)
        self.assertEqual(self.app.camera_url, "http://192.168.1.50")

    def test_writes_require_json_content_type(self):
        status, _ = self.call("/api/settings", {"cameraUrl": "10.0.0.9"}, "PUT", content_type="text/plain")
        self.assertEqual(status, 415)
        status, _ = self.call("/api/evaluations", {"placeName": "Aula", "soundDbfs": -20}, content_type="text/plain")
        self.assertEqual(status, 415)
        self.assertEqual(self.model.requests, [])

    def test_model_loading_is_reported_and_blocks_evaluations(self):
        self.app.model_loading = True
        model = next(c for c in self.call("/api/device/status")[1]["components"] if c["key"] == "model")
        self.assertEqual(model["health"], "degradado")
        self.assertEqual(self.call("/api/evaluations", {"placeName": "Aula", "soundDbfs": -20})[0], 503)


if __name__ == "__main__":
    unittest.main()


class NetworkTests(unittest.TestCase):
    def server(self, host):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        server = create_server(host, 0, data_dir=tmp.name, frontend_dir=tmp.name)
        self.addCleanup(server.server_close)
        return server

    def test_local_only_server_is_not_shared(self):
        self.assertEqual(self.server("127.0.0.1").network()["shared"], False)
        self.assertIsNone(self.server("127.0.0.1").network()["url"])

    def test_network_server_reports_its_lan_url(self):
        server = self.server("0.0.0.0")
        network = server.network()
        self.assertTrue(network["shared"])
        if network["url"] is not None:  # Sin red (CI aislado) no hay dirección que mostrar.
            self.assertRegex(network["url"], rf"^http://\d+\.\d+\.\d+\.\d+:{server.server_port}$")
            self.assertFalse(network["url"].startswith("http://127."))

    def test_lan_address_ignores_loopback_and_bad_targets(self):
        from backend.server import lan_address
        loopback = lan_address("127.0.0.1")  # Simulador local: cae a la interfaz principal.
        self.assertTrue(loopback is None or not loopback.startswith("127."))
        address = lan_address("esp32sensores.local")
        self.assertTrue(address is None or not address.startswith("127."))
