"""Compila StudyBot en una carpeta ejecutable para el sistema actual (Windows o Linux).

Desde RobotLoro/, con el entorno de requirements-build.txt activo:
    python packaging/build.py [--lorbot-dir LorBot_API]

Resultado: packaging/dist/StudyBot/ (StudyBot.exe en Windows) y un .zip para repartir.
PyInstaller no compila para otro sistema: el .exe se genera en Windows.
"""
import argparse
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROBOTLORO = HERE.parent
BUILD = HERE / "build"
DIST = HERE / "dist"


def run(*command, **kwargs):
    print("$", " ".join(map(str, command)), flush=True)
    subprocess.run(command, check=True, **kwargs)


def build_dashboard():
    npm = shutil.which("npm")
    if not npm:
        sys.exit("Falta Node.js (npm) para compilar el dashboard: https://nodejs.org")
    frontend = ROBOTLORO / "frontend_new"
    run(npm, "ci", "--no-audit", "--no-fund", cwd=frontend)
    run(npm, "run", "build", cwd=frontend)


def export_clip(lorbot_dir):
    """Guarda CLIP (solo safetensors) para que el paquete funcione sin internet."""
    target = BUILD / "clip"
    if (target / "config.json").is_file():
        print(f"CLIP ya exportado en {target}", flush=True)
        return
    import joblib
    from transformers import CLIPModel, CLIPProcessor

    pipeline = joblib.load(lorbot_dir / "lorbot_pipeline.joblib")
    model_id, revision = pipeline["clip_id"], pipeline.get("clip_revision")
    print(f"Descargando {model_id}…", flush=True)
    CLIPModel.from_pretrained(model_id, revision=revision).save_pretrained(target, safe_serialization=True)
    CLIPProcessor.from_pretrained(model_id, revision=revision).save_pretrained(target)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--lorbot-dir", type=Path, default=ROBOTLORO / "LorBot_API")
    parser.add_argument("--skip-dashboard", action="store_true", help="Usar frontend_new/dist tal cual")
    args = parser.parse_args()
    lorbot_dir = args.lorbot_dir.resolve()
    if not (lorbot_dir / "app.py").is_file():
        sys.exit(f"No encuentro LorBot_API/app.py en {lorbot_dir}; usa --lorbot-dir")

    if not args.skip_dashboard:
        build_dashboard()
    export_clip(lorbot_dir)

    env = {**os.environ, "STUDYBOT_ROBOTLORO": str(ROBOTLORO), "STUDYBOT_LORBOT": str(lorbot_dir),
           "STUDYBOT_BUILD": str(BUILD)}
    run(sys.executable, "-m", "PyInstaller", "--noconfirm", "--clean",
        "--distpath", DIST, "--workpath", BUILD / "pyinstaller", HERE / "studybot.spec", env=env)

    system = {"Windows": "windows", "Linux": "linux", "Darwin": "macos"}.get(platform.system(), platform.system())
    archive = shutil.make_archive(str(DIST / f"StudyBot-{system}-{platform.machine().lower()}"), "zip",
                                  DIST, "StudyBot")
    print(f"\nListo: {DIST / 'StudyBot'}\nPara repartir: {archive}", flush=True)


if __name__ == "__main__":
    main()
