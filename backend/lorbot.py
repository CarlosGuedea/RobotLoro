"""Cliente de la API LorBot (modelo CLIP + SVC): POST /predict y GET /health."""
import json
import uuid
from urllib.error import HTTPError
from urllib.request import ProxyHandler, Request, build_opener

MAX_RESPONSE_BYTES = 64 * 1024
# Nombres de clase del modelo (`class_names` en lorbot_pipeline.joblib) → veredicto del dashboard.
VERDICTS = {"Apto": "apto", "No apto": "no_apto"}


class LorBotError(Exception):
    """La API LorBot no respondió o respondió algo que no se puede usar."""


def _open(request, timeout):
    # Sin proxies del sistema: la API corre en esta misma máquina o en la LAN.
    return build_opener(ProxyHandler({})).open(request, timeout=timeout)


def _multipart(fields, file_field, filename, data, mime):
    boundary = f"loro-{uuid.uuid4().hex}"
    parts = []
    for name, value in fields.items():
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode())
    parts.append(
        f'--{boundary}\r\nContent-Disposition: form-data; name="{file_field}"; filename="{filename}"\r\n'
        f"Content-Type: {mime}\r\n\r\n".encode() + data + b"\r\n"
    )
    parts.append(f"--{boundary}--\r\n".encode())
    return b"".join(parts), f"multipart/form-data; boundary={boundary}"


def predict(base_url, jpeg, temperature_c, sound_dbfs, timeout=60):
    """Devuelve 'apto' o 'no_apto'. Lanza LorBotError con un mensaje para la persona usuaria."""
    body, content_type = _multipart(
        {"temperature_c": repr(float(temperature_c)), "sound_dbfs": repr(float(sound_dbfs))},
        "image", "captura.jpg", jpeg, "image/jpeg",
    )
    request = Request(base_url.rstrip("/") + "/predict", data=body, method="POST",
                      headers={"Content-Type": content_type, "Accept": "application/json"})
    try:
        with _open(request, timeout) as response:
            payload = json.loads(response.read(MAX_RESPONSE_BYTES))
    except HTTPError as error:
        try:
            message = json.loads(error.read(MAX_RESPONSE_BYTES)).get("error")
        except (ValueError, AttributeError):
            message = None
        raise LorBotError(message or f"La API LorBot respondió {error.code}.") from error
    except (OSError, ValueError) as error:
        raise LorBotError("No se pudo contactar a la API LorBot. ¿Está iniciada?") from error

    label = payload.get("prediction") if isinstance(payload, dict) else None
    if label not in VERDICTS:
        raise LorBotError(f"La API LorBot devolvió una clase desconocida: {label!r}.")
    return VERDICTS[label]


def healthy(base_url, timeout=2):
    try:
        with _open(Request(base_url.rstrip("/") + "/health"), timeout) as response:
            return response.status == 200
    except OSError:
        return False
