"""Prueba el paquete ya compilado: lo abre, espera al modelo y hace una evaluación real.

    python packaging/smoke_test.py [packaging/dist/StudyBot/StudyBot.exe]

No necesita los ESP32: manda temperatura y ruido manuales y una foto generada.
Termina con código 0 si todo respondió bien. Lo usa el workflow de GitHub Actions.
"""
import base64
import io
import json
import os
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
DEFAULT_EXE = HERE / "dist" / "StudyBot" / ("StudyBot.exe" if os.name == "nt" else "StudyBot")
MODEL_TIMEOUT = 600  # La primera carga de torch en un runner frío puede tardar.


def free_port():
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        return probe.getsockname()[1]


def request(url, body=None, timeout=120):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"} if data else {})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.status, response.read()


def sample_photo():
    image = Image.new("RGB", (640, 480), (200, 190, 170))
    draw = ImageDraw.Draw(image)
    draw.rectangle((80, 260, 560, 300), fill=(120, 80, 50))  # Una mesa.
    draw.rectangle((100, 40, 300, 200), fill=(170, 210, 240))  # Una ventana.
    buffer = io.BytesIO()
    image.save(buffer, "JPEG", quality=85)
    return "data:image/jpeg;base64," + base64.b64encode(buffer.getvalue()).decode()


def wait_for_model(base, process):
    deadline = time.monotonic() + MODEL_TIMEOUT
    while time.monotonic() < deadline:
        if process.poll() is not None:
            sys.exit(f"StudyBot se cerró con código {process.returncode}")
        try:
            _, raw = request(f"{base}/api/device/status", timeout=10)
            model = next(c for c in json.loads(raw)["components"] if c["key"] == "model")
            print(f"  modelo: {model['health']} · {model['detail']}", flush=True)
            if model["health"] == "ok":
                return
        except (urllib.error.URLError, OSError, ValueError):
            print("  esperando al backend…", flush=True)
        time.sleep(5)
    sys.exit(f"El modelo no quedó listo en {MODEL_TIMEOUT} s")


def main():
    exe = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else DEFAULT_EXE
    if not exe.is_file():
        sys.exit(f"No existe {exe}")
    port = free_port()
    base = f"http://127.0.0.1:{port}"
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as data_dir:
        env = {**os.environ, "STUDYBOT_DATA_DIR": data_dir}
        print(f"$ {exe} --port {port} --no-browser", flush=True)
        process = subprocess.Popen([str(exe), "--port", str(port), "--no-browser"], env=env,
                                   stdin=subprocess.DEVNULL)
        try:
            wait_for_model(base, process)

            status, html = request(f"{base}/")
            assert status == 200 and b'id="root"' in html, "El dashboard no se sirvió"
            print("  dashboard: ok", flush=True)

            status, raw = request(f"{base}/api/evaluations", {
                "placeName": "Prueba automática", "temperatureC": 30.5, "soundDbfs": -22.0,
                "soundSource": "manual", "photo": sample_photo(),
            })
            evaluation = json.loads(raw)
            assert status == 201, f"POST /api/evaluations respondió {status}"
            assert evaluation["verdict"] in ("apto", "no_apto"), evaluation
            print(f"  evaluación: {evaluation['verdict']}", flush=True)

            status, photo = request(base + evaluation["photoUrl"])
            assert status == 200 and photo[:2] == b"\xff\xd8", "La foto guardada no es un JPEG"
            print("  foto guardada: ok", flush=True)
        finally:
            process.terminate()
            try:
                process.wait(timeout=20)
            except subprocess.TimeoutExpired:
                process.kill()
    print("Prueba del paquete: OK", flush=True)


if __name__ == "__main__":
    main()
