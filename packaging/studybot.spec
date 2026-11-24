# Especificación de PyInstaller. No se usa directo: la llama build.py con las rutas en el entorno.
import os
from pathlib import Path

from PyInstaller.utils.hooks import collect_data_files, collect_submodules, copy_metadata

ROBOTLORO = Path(os.environ["STUDYBOT_ROBOTLORO"])
LORBOT = Path(os.environ["STUDYBOT_LORBOT"])
BUILD = Path(os.environ["STUDYBOT_BUILD"])

datas = [
    (str(ROBOTLORO / "frontend_new" / "dist"), "dashboard"),
    (str(BUILD / "clip"), "clip"),
    (str(LORBOT / "lorbot_pipeline.joblib"), "."),
    (str(LORBOT / "templates"), "templates"),
]
# transformers revisa versiones de sus dependencias con importlib.metadata.
for package in ("transformers", "tokenizers", "huggingface-hub", "safetensors", "torch", "numpy",
                "tqdm", "regex", "filelock", "packaging", "pyyaml", "scikit-learn", "joblib", "Pillow"):
    datas += copy_metadata(package)
datas += collect_data_files("transformers", include_py_files=False)

hiddenimports = (
    collect_submodules("transformers.models.clip")
    + ["sklearn.pipeline", "sklearn.preprocessing", "sklearn.svm", "backend.server", "app"]
)

a = Analysis(
    [str(ROBOTLORO / "packaging" / "launcher.py")],
    pathex=[str(ROBOTLORO), str(LORBOT)],
    datas=datas,
    hiddenimports=hiddenimports,
    excludes=["tkinter", "matplotlib", "IPython", "jupyter", "pytest", "tensorflow", "jax", "onnx"],
    # torch y transformers leen su propio código fuente en algunos caminos (inspect).
    module_collection_mode={"torch": "pyz+py", "transformers": "pyz+py"},
)
pyz = PYZ(a.pure)
exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="StudyBot",
    console=True,  # La ventana muestra el estado y se cierra para detener el programa.
    icon=os.environ.get("STUDYBOT_ICON") or None,
)
coll = COLLECT(exe, a.binaries, a.datas, name="StudyBot")
