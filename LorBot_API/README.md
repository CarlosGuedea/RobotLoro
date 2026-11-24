# LorBot API

En macOS, abre `Iniciar.command` para crear el entorno, instalar las dependencias e iniciar la API en `http://127.0.0.1:5055`. También puedes ejecutar `./Iniciar.command` desde Terminal. Se probó con Python 3.12. La primera ejecución necesita internet para instalar las dependencias y descargar CLIP. Mantén abierta la ventana de Terminal mientras usas la API.

Abre http://127.0.0.1:5055 en tu navegador para subir una foto y escribir las mediciones.

Para usar la API directamente, envía un POST multipart con la imagen en `image`, la temperatura en °C en `temperature_c` y el ruido en dBFS en `sound_dbfs`.

```bash
curl http://127.0.0.1:5055/predict \
  -F 'image=@/ruta/a/foto.jpg' \
  -F 'temperature_c=24' \
  -F 'sound_dbfs=-22'
```

La respuesta contiene `prediction` con la clase del modelo y las dos mediciones recibidas. Puedes consultar `GET /health` para saber si el servidor está listo. Para detenerlo, pulsa Ctrl+C en Terminal.
