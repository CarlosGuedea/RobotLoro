"""Consulta y validación de las muestras del ESP32 de sensores."""
import json
import math
import socket
from urllib.parse import urlsplit
from urllib.request import ProxyHandler, Request, build_opener

MAX_SENSOR_BYTES = 4096


def fetch_readings(base_url, timeout=3):
    headers = {"Accept": "application/json"}
    address = base_url.rstrip("/")
    parsed = urlsplit(address)
    if parsed.hostname and parsed.hostname.endswith(".local"):
        # La placa usa IPv4. Evita esperar consultas AAAA de mDNS sin respuesta
        # que pueden añadir ~5 s antes de cada conexión en macOS.
        ipv4 = socket.gethostbyname(parsed.hostname)
        port = f":{parsed.port}" if parsed.port else ""
        address = f"http://{ipv4}{port}"
        headers["Host"] = parsed.netloc
    request = Request(address + "/readings", headers=headers)
    with build_opener(ProxyHandler({})).open(request, timeout=timeout) as response:
        if response.headers.get_content_type() != "application/json":
            raise ValueError("La placa no respondió con JSON.")
        data = response.read(MAX_SENSOR_BYTES + 1)
    if len(data) > MAX_SENSOR_BYTES:
        raise ValueError("Respuesta de sensores demasiado grande.")
    value = json.loads(data)
    if not isinstance(value, dict):
        raise ValueError("Muestra inválida.")
    for field in ("dht_ok", "sound_detected"):
        if type(value.get(field)) is not bool:
            raise ValueError(f"{field} debe ser booleano.")
    for field in ("sample_age_ms", "uptime_ms", "sound_activity_count"):
        if type(value.get(field)) is not int or not 0 <= value[field] <= 0xFFFFFFFF:
            raise ValueError(f"{field} inválido.")
    if type(value.get("sound_level")) is not int or value["sound_level"] not in (0, 1):
        raise ValueError("Nivel digital inválido.")
    for field, low, high in (("temperature_c", -40, 80), ("humidity_pct", 0, 100)):
        number = value.get(field)
        if value["dht_ok"]:
            if type(number) not in (int, float) or not math.isfinite(number) or not low <= number <= high:
                raise ValueError(f"{field} fuera de rango.")
        elif number is not None:
            raise ValueError("Un fallo DHT debe incluir valores nulos.")
    fields = ("temperature_c", "humidity_pct", "dht_ok", "sound_detected", "sound_level", "sample_age_ms", "uptime_ms", "sound_activity_count")
    return {field: value[field] for field in fields}
