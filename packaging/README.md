# Empaquetado de StudyBot

Genera una carpeta autocontenida con **todo** el producto: modelo LorBot (PyTorch + CLIP),
backend y dashboard. Quien la usa no necesita instalar Python, Node ni descargar nada: abre
`StudyBot` (o `StudyBot.exe`) y se abre el navegador.

```text
packaging/
  launcher.py              Punto de entrada: modelo + backend + dashboard en un proceso
  studybot.spec            Configuración de PyInstaller
  build.py                 Compila el dashboard, exporta CLIP y ejecuta PyInstaller
  requirements-build.txt   Dependencias para compilar
  smoke_test.py            Abre el paquete compilado y hace una evaluación de prueba
```

## Descargar desde GitHub (recomendado)

El workflow [`.github/workflows/package.yml`](../.github/workflows/package.yml) compila el
paquete de Windows y el de Linux en GitHub Actions, abre cada uno y hace una evaluación de
prueba antes de publicarlo. Se ejecuta solo con cada push a `main` o `frontend-new` que toque
el producto, o a mano desde **Actions → Empaquetar StudyBot → Run workflow**.

- **Zips de un run:** Actions → el run → sección **Artifacts** → `StudyBot-Windows` o
  `StudyBot-Linux` (se guardan 30 días). GitHub los entrega dentro de otro zip: descomprímelo
  una vez para sacar `StudyBot-windows-amd64.zip`.
- **Versión publicada:** crea una etiqueta y el workflow arma un Release con los dos zips:

```bash
git tag v1.0.0
git push origin v1.0.0
```

## Compilar en tu computadora

PyInstaller solo compila para el sistema donde se ejecuta: **el `.exe` se genera en Windows** y
el de Linux en Linux. Los pasos son iguales en ambos. Requisitos: Python 3.12, Node.js 20 o
superior, unos 6 GB libres e internet la primera vez (para descargar PyTorch y CLIP).

Usa el modelo de `LorBot_API/` (dentro de este repositorio); otra ruta con `--lorbot-dir`.

**Linux**

```bash
cd RobotLoro
python3.12 -m venv .venv-build
.venv-build/bin/pip install -r packaging/requirements-build.txt --extra-index-url https://download.pytorch.org/whl/cpu
.venv-build/bin/python packaging/build.py
```

**Windows (PowerShell)**

```powershell
cd RobotLoro
py -3.12 -m venv .venv-build
.venv-build\Scripts\pip install -r packaging\requirements-build.txt --extra-index-url https://download.pytorch.org/whl/cpu
.venv-build\Scripts\python packaging\build.py
```

Resultado en `packaging/dist/`:

- `StudyBot/`: la carpeta del programa (`StudyBot.exe` en Windows).
- `StudyBot-<sistema>-<arquitectura>.zip`: la misma carpeta comprimida para repartir.

Es una carpeta y no un solo `.exe` a propósito: un archivo único de este tamaño tendría que
descomprimirse completo en cada arranque y tardaría mucho más en abrir.

## Usar el paquete

1. Descomprime el `.zip` en cualquier carpeta (por ejemplo, Documentos).
2. Conecta la computadora a la red Wi-Fi **linksys**, la misma de los ESP32.
3. Abre `StudyBot.exe` (Windows) o `StudyBot` (Linux). Se abre una ventana de consola y el
   navegador en `http://localhost:8000`, u otro puerto si el 8000 está ocupado: la consola
   muestra cuál.
4. El modelo tarda unos segundos en cargar; el panel lo indica en **Dispositivo**.
5. Si la cámara o los sensores aparecen en rojo, ve a **Configuración** y escribe sus IPs
   (salen en el monitor serie de Arduino a 115200 baudios).
6. Para cerrar StudyBot, cierra la ventana de consola.

Windows puede mostrar **«Windows protegió tu PC»** porque el ejecutable no está firmado:
«Más información» → «Ejecutar de todas formas». La primera vez el firewall puede preguntar por
el acceso a la red: permítelo en redes privadas para que se pueda hablar con los ESP32.

El historial, las fotos, la configuración y el registro (`studybot.log`) se guardan en:

- Windows: `%LOCALAPPDATA%\StudyBot`
- Linux: `~/.local/share/StudyBot`

### Desde el celular u otras computadoras

StudyBot se abre para la red: cualquier dispositivo conectado a **linksys** puede usar el
dashboard en el navegador, sin instalar nada. La consola muestra la dirección
(`http://192.168.x.x:8000`) y **Configuración → Abrir desde el celular** tiene un código QR.

- La computadora con StudyBot debe quedar encendida: ella habla con los ESP32 y corre el modelo.
- Si el celular no carga la página, en Windows permite StudyBot en el firewall y marca la red
  linksys como **privada** (Configuración → Red e Internet → Wi-Fi → linksys).
- El botón de micrófono del navegador solo funciona en la computadora (`localhost`). En el
  celular el ruido lo mide el INMP441 del loro o se escribe a mano.
- linksys no tiene contraseña: quien se conecte a ella puede abrir el dashboard. Para usarlo
  solo en la computadora: `StudyBot --host 127.0.0.1`.

Otras opciones: `--port 9000`, `--no-browser`.

## Probar sin empaquetar

```bash
python packaging/launcher.py
```

Usa `LorBot_API/` y `frontend_new/dist` (compílalo antes con `npm --prefix frontend_new run build`).
