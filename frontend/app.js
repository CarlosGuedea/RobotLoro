const $ = (selector) => document.querySelector(selector);
const captureButton = $('#capture');
captureButton.disabled = true;
let currentUrl = null;

function message(text, error = false) {
  $('#message').textContent = text;
  $('#message').classList.toggle('error', error);
}

function backendState(available) {
  $('#backend-state').textContent = available ? 'Servidor disponible' : 'Servidor sin respuesta';
  $('#backend-state').classList.toggle('ready', available);
}

async function showPhoto(response) {
  const blob = await response.blob();
  if (!blob.type.startsWith('image/jpeg')) throw new Error('El servidor no devolvió una foto JPEG.');
  const nextUrl = URL.createObjectURL(blob);
  const decoded = new Image();
  decoded.src = nextUrl;
  try { await decoded.decode(); }
  catch (error) { URL.revokeObjectURL(nextUrl); throw new Error('No se pudo abrir la imagen recibida.'); }
  const previous = currentUrl;
  currentUrl = nextUrl;
  $('#photo').src = nextUrl;
  $('#photo').hidden = false;
  $('#empty').hidden = true;
  $('#download').href = nextUrl;
  $('#download').hidden = false;
  const date = response.headers.get('X-Captured-At');
  $('#captured-at').textContent = date ? new Date(date).toLocaleString('es-MX') : 'Fecha no disponible';
  $('#resolution').textContent = `${decoded.naturalWidth} × ${decoded.naturalHeight} px`;
  $('#file-size').textContent = `${(blob.size / 1024).toLocaleString('es-MX', {maximumFractionDigits: 1})} KB`;
  $('#image-state').textContent = 'Última foto';
  $('#photo-caption').textContent = 'Imagen fija. Pulsa “Tomar foto” para actualizarla.';
  if (previous) URL.revokeObjectURL(previous);
}

captureButton.addEventListener('click', async () => {
  captureButton.disabled = true;
  captureButton.querySelector('span').textContent = 'Tomando foto…';
  $('.viewer').setAttribute('aria-busy', 'true');
  $('#loading').hidden = false;
  message('Esperando la respuesta de la cámara…');
  try {
    const response = await fetch('/api/capture', {method: 'POST', signal: AbortSignal.timeout(15000)});
    backendState(true);
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'No se pudo tomar la foto.');
    }
    await showPhoto(response);
    $('#camera-state').textContent = 'Respondió a la última captura';
    message('Foto recibida. Puedes descargarla o solicitar una nueva captura.');
  } catch (error) {
    if (error instanceof TypeError || error.name === 'TimeoutError') backendState(false);
    $('#camera-state').textContent = 'Último intento sin respuesta válida';
    message(error.name === 'TimeoutError' ? 'La solicitud tardó demasiado. Revisa la cámara y vuelve a intentar.' :
      error instanceof TypeError ? 'No se pudo conectar con el servidor. Comprueba que Python siga ejecutándose.' : error.message, true);
  } finally {
    captureButton.disabled = false;
    captureButton.querySelector('span').textContent = 'Tomar foto';
    $('.viewer').setAttribute('aria-busy', 'false');
    $('#loading').hidden = true;
  }
});

async function init() {
  try {
    const response = await fetch('/api/status', {signal: AbortSignal.timeout(5000)});
    if (!response.ok) throw new Error('Servidor no disponible');
    const state = await response.json();
    backendState(true);
    if (state.has_image) {
      const photo = await fetch('/api/latest.jpg', {signal: AbortSignal.timeout(5000)});
      if (photo.ok) { await showPhoto(photo); message('Última foto recuperada. Puedes solicitar una nueva captura.'); }
    }
  } catch (error) {
    backendState(false);
    message('Inicia el backend Python y abre esta página desde su dirección local.', true);
  } finally {
    captureButton.disabled = false;
  }
}
init();
