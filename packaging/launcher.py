"""StudyBot Loro en un solo proceso: modelo LorBot + backend + dashboard, y abre el navegador.

Es el punto de entrada del ejecutable (PyInstaller). También funciona sin empaquetar:
    python packaging/launcher.py            # usa LorBot_API/ y frontend_new/dist
"""
import argparse
import logging
import os
import socket
import sys
import threading
import traceback
import webbrowser
from pathlib import Path

FROZEN = getattr(sys, "frozen", False)
if FROZEN:
    # Dentro del paquete todo vive junto: backend/, app.py de LorBot, dashboard/, clip/.
    BUNDLE = Path(sys._MEIPASS)
    ROBOTLORO, LORBOT_DIR = BUNDLE, BUNDLE
    FRONTEND, CLIP_DIR = BUNDLE / "dashboard", BUNDLE / "clip"
else:
    ROBOTLORO = Path(__file__).resolve().parent.parent
    LORBOT_DIR = Path(os.getenv("LORBOT_DIR", ROBOTLORO / "LorBot_API")).resolve()
    FRONTEND = ROBOTLORO / "frontend_new" / "dist"
    CLIP_DIR = Path(os.getenv("LORBOT_CLIP_DIR", ROBOTLORO / "packaging" / "build" / "clip"))

if CLIP_DIR.is_dir():
    # CLIP viene dentro del paquete: no se descarga nada ni se consulta Hugging Face.
    os.environ.setdefault("HF_HUB_OFFLINE", "1")
    os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")

sys.path[:0] = [str(ROBOTLORO), str(LORBOT_DIR)]


def data_directory():
    if os.getenv("STUDYBOT_DATA_DIR"):
        return Path(os.environ["STUDYBOT_DATA_DIR"])
    if sys.platform == "win32":
        return Path(os.getenv("LOCALAPPDATA", Path.home() / "AppData" / "Local")) / "StudyBot"
    if sys.platform == "darwin":
        return Path.home() / "Library" / "Application Support" / "StudyBot"
    return Path(os.getenv("XDG_DATA_HOME", Path.home() / ".local" / "share")) / "StudyBot"


def port_is_free(host, port):
    with socket.socket() as probe:
        try:
            probe.bind((host, port))
            return True
        except OSError:
            return False


def free_port():
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        return probe.getsockname()[1]


def use_bundled_clip():
    """El modelo guarda el id de Hugging Face de CLIP; si hay copia local, se usa esa."""
    if not CLIP_DIR.is_dir():
        return
    import joblib

    original = joblib.load

    def load(*args, **kwargs):
        pipeline = original(*args, **kwargs)
        if isinstance(pipeline, dict) and "clip_id" in pipeline:
            pipeline = {**pipeline, "clip_id": str(CLIP_DIR), "clip_revision": None}
        return pipeline

    joblib.load = load


def serve_model(backend, port):
    """Carga CLIP (tarda unos segundos) y sirve la API LorBot solo en esta máquina."""
    try:
        use_bundled_clip()
        import app as lorbot_app  # LorBot_API/app.py
        from werkzeug.serving import make_server

        server = make_server("127.0.0.1", port, lorbot_app.create_app(), threaded=True)
        logging.info("Modelo LorBot listo.")
        backend.model_loading = False
        server.serve_forever()
    except Exception:
        backend.model_loading = False
        logging.error("No se pudo iniciar el modelo LorBot:\n%s", traceback.format_exc())


def main():
    parser = argparse.ArgumentParser(description="StudyBot Loro")
    parser.add_argument("--port", type=int, default=8000, help="Puerto del dashboard (8000)")
    parser.add_argument("--host", default="127.0.0.1",
                        help="0.0.0.0 para abrir el dashboard desde otros equipos de la red")
    parser.add_argument("--no-browser", action="store_true", help="No abrir el navegador")
    args = parser.parse_args()

    data_dir = data_directory()
    data_dir.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s",
                        handlers=[logging.StreamHandler(), logging.FileHandler(data_dir / "studybot.log", encoding="utf-8")])

    from backend.server import create_server

    port = args.port if port_is_free(args.host, args.port) else 0
    model_port = free_port()
    backend = create_server(args.host, port, api_url=f"http://127.0.0.1:{model_port}",
                            data_dir=data_dir, frontend_dir=FRONTEND)
    backend.model_loading = True
    backend.start_sampler()
    threading.Thread(target=backend.serve_forever, name="backend", daemon=True).start()

    url = f"http://localhost:{backend.server_port}"
    print("\n  StudyBot Loro está corriendo.", flush=True)
    print(f"  Abre {url}  ·  datos en {data_dir}", flush=True)
    print("  Cierra esta ventana (o Ctrl+C) para detenerlo.\n", flush=True)
    if not args.no_browser:
        webbrowser.open(url)

    model = threading.Thread(target=serve_model, args=(backend, model_port), name="lorbot", daemon=True)
    model.start()
    try:
        threading.Event().wait()
    except KeyboardInterrupt:
        pass
    finally:
        backend.shutdown()


if __name__ == "__main__":
    try:
        main()
    except Exception:
        traceback.print_exc()
        if FROZEN:  # Que la ventana no se cierre antes de poder leer el error.
            input("\nStudyBot no pudo iniciar. Presiona Enter para salir…")
        sys.exit(1)
