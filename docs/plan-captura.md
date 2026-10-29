# Plan de captura bajo demanda

Diseño: [esp32cam-diseno.md](esp32cam-diseno.md), actualización del 29 de octubre.

1. [x] Reorganizar el firmware de sensores sin modificarlo.
2. [x] Escribir y ejecutar pruebas HTTP del backend antes de implementarlo: JPEG, fallos de cámara, límites, conservación de imagen y rutas.
3. [x] Implementar y compilar el servidor ESP32-CAM para red abierta, mDNS, captura y reconexión.
4. [x] Crear el frontend con estados inicial, en curso, foto y error. Verificarlo con cámara simulada en navegador.
5. [x] Documentar inicio, configuración y carga. Carga física a 115200 completada; cámara en 192.168.1.129 y JPEG real recibido por el backend.
