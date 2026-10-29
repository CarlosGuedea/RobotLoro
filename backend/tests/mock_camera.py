"""Cámara simulada SOLO para pruebas. python3 -m backend.tests.mock_camera"""
import argparse
import io
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from PIL import Image, ImageDraw


class MockCamera(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != "/capture":
            self.send_error(404)
            return
        image = Image.new("RGB", (800, 600), "#dce6df")
        draw = ImageDraw.Draw(image)
        draw.rectangle((40, 40, 760, 560), outline="#4c7159", width=3)
        draw.text((80, 260), "CAMARA SIMULADA - SOLO PRUEBAS", fill="#213e2b", font_size=28)
        data = io.BytesIO()
        image.save(data, "JPEG")
        body = data.getvalue()
        self.send_response(200)
        self.send_header("Content-Type", "image/jpeg")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8001)
    args = parser.parse_args()
    print(f"SOLO PRUEBAS: cámara simulada en http://127.0.0.1:{args.port}", flush=True)
    with ThreadingHTTPServer(("127.0.0.1", args.port), MockCamera) as server:
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
