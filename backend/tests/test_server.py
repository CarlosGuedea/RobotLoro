import io
import json
import threading
import unittest
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
        self.app = create_server("127.0.0.1", 0, f"http://127.0.0.1:{self.camera.server_port}", timeout=0.5)
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
        self.assertEqual(self.fetch("/")[0], 200)
        self.assertEqual(self.fetch("/app.js")[0], 200)
        self.assertEqual(self.fetch("/api/capture")[0], 405)
        self.assertEqual(self.fetch("/../backend/server.py")[0], 404)
        self.assertEqual(self.fetch("/missing")[0], 404)

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


if __name__ == "__main__":
    unittest.main()
