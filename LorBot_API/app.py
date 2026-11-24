from io import BytesIO
from pathlib import Path

import joblib
import numpy as np
import torch
from flask import Flask, jsonify, render_template, request
from PIL import Image, ImageOps, UnidentifiedImageError
from transformers import CLIPModel, CLIPProcessor

MODEL_PATH = Path(__file__).with_name("lorbot_pipeline.joblib")


class LorBot:
    def __init__(self, path):
        self.pipeline = joblib.load(path)
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model_id = self.pipeline["clip_id"]
        revision = self.pipeline.get("clip_revision")
        self.processor = CLIPProcessor.from_pretrained(model_id, revision=revision)
        self.encoder = CLIPModel.from_pretrained(model_id, revision=revision)
        self.encoder.eval().to(self.device)
        self.references = torch.from_numpy(self.pipeline["text_vectors"]).to(self.device)

    @torch.inference_mode()
    def predict(self, image, temperature, noise):
        pixels = self.processor(images=[image], return_tensors="pt").to(self.device)
        output = self.encoder.get_image_features(**pixels)
        embeddings = output if torch.is_tensor(output) else output.pooler_output
        embeddings = torch.nn.functional.normalize(embeddings, dim=-1)
        scores = (embeddings @ self.references.T).cpu().numpy()
        inputs = np.column_stack(([[temperature, noise]], scores)).astype(np.float32)
        label = int(self.pipeline["classifier"].predict(inputs)[0])

        temperature_limit = self.pipeline.get("temperature_limit_c")
        noise_limit = self.pipeline.get("sound_limit_dbfs")
        if (
            temperature_limit is not None
            and noise_limit is not None
            and temperature >= temperature_limit
            and noise >= noise_limit
        ):
            label = self.pipeline["class_names"].index("No apto")

        return self.pipeline["class_names"][label]


def create_app():
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024
    model = LorBot(MODEL_PATH)

    @app.get("/")
    def index():
        return render_template("index.html")

    @app.get("/health")
    def health():
        return jsonify(status="ok")

    @app.errorhandler(413)
    def request_too_large(_error):
        return jsonify(error="La petición supera el límite de 16 MB."), 413

    @app.post("/predict")
    def predict():
        upload = request.files.get("image")
        if not upload or not upload.filename:
            return jsonify(error="Envía una imagen en el campo image."), 400

        try:
            temperature, noise = (
                float(request.form.get(field, ""))
                for field in ("temperature_c", "sound_dbfs")
            )
            if not np.isfinite(np.float32([temperature, noise])).all():
                raise ValueError
        except (ValueError, OverflowError):
            return jsonify(error="temperature_c y sound_dbfs deben ser números finitos."), 400

        try:
            with Image.open(BytesIO(upload.read())) as source:
                image = ImageOps.exif_transpose(source).convert("RGB")
        except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
            return jsonify(error="Envía una imagen válida, por ejemplo JPG o PNG."), 400

        prediction = model.predict(image, temperature, noise)
        return jsonify(prediction=prediction, temperature_c=temperature, sound_dbfs=noise)

    return app


if __name__ == "__main__":
    create_app().run(host="127.0.0.1", port=5055)
