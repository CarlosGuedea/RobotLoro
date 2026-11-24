"""Historial de evaluaciones en disco: un JSON con los registros y una carpeta de fotos."""
import json
import os
import re
import threading
import unicodedata
import uuid
from pathlib import Path

PHOTO_ID = re.compile(r"^ev-[0-9a-f]{12}$")


def place_id(name):
    """Mismo nombre sin importar acentos/mayúsculas = mismo lugar."""
    ascii_name = unicodedata.normalize("NFD", name).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", ascii_name.lower()).strip("-") or "lugar"


class EvaluationStore:
    def __init__(self, directory):
        self.directory = Path(directory)
        self.photos = self.directory / "photos"
        self.photos.mkdir(parents=True, exist_ok=True)
        self.file = self.directory / "evaluations.json"
        self.lock = threading.Lock()
        try:
            self.items = json.loads(self.file.read_text(encoding="utf-8"))
        except FileNotFoundError:
            self.items = []

    def _save(self):
        temporary = self.file.with_suffix(".tmp")
        temporary.write_text(json.dumps(self.items, ensure_ascii=False, indent=1), encoding="utf-8")
        os.replace(temporary, self.file)  # Escritura atómica: un corte no deja el JSON a medias.

    def new_id(self):
        return f"ev-{uuid.uuid4().hex[:12]}"

    def add(self, evaluation, jpeg):
        with self.lock:
            (self.photos / f"{evaluation['id']}.jpg").write_bytes(jpeg)
            self.items.insert(0, evaluation)
            self._save()
        return evaluation

    def evaluations(self, place=None):
        with self.lock:
            return [e for e in self.items if place is None or e["placeId"] == place]

    def places(self):
        grouped = {}
        for evaluation in self.evaluations():  # Más reciente primero.
            place = grouped.get(evaluation["placeId"])
            if place:
                place["evaluationsCount"] += 1
            else:
                grouped[evaluation["placeId"]] = {"id": evaluation["placeId"], "name": evaluation["placeName"],
                                                  "lastEvaluation": evaluation, "evaluationsCount": 1}
        return list(grouped.values())

    def photo(self, evaluation_id):
        if not PHOTO_ID.match(evaluation_id):
            return None
        try:
            return (self.photos / f"{evaluation_id}.jpg").read_bytes()
        except FileNotFoundError:
            return None
