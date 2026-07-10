/* The only hand-written client code in EatThis: theme toggle + camera capture.
   TypeScript source of truth — compile with:
     npx -y typescript@latest --target es2019 --strict --outDir web/static web/ts/app.ts
   Everything else is server-rendered HTML driven by htmx. */

// ---- theme ----
function toggleTheme(): void {
  const dark = document.documentElement.classList.toggle('dark');
  try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch { /* private mode */ }
  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = dark ? '○' : '●';
}

// ---- camera ----
let cameraStream: MediaStream | null = null;

function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

function setActionButton(text: string, onclick: (() => void) | null, disabled = false): void {
  const btn = el<HTMLButtonElement>('action-btn');
  if (!btn) return;
  btn.textContent = text;
  btn.onclick = onclick;
  btn.disabled = disabled;
}

async function openCamera(): Promise<void> {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }, audio: false,
    });
    el<HTMLVideoElement>('camera-video').srcObject = cameraStream;
    el('camera-panel').classList.remove('hidden');
    setActionButton('Capture', capturePhoto);
  } catch {
    el('status-text').textContent =
      'Could not access the camera. Please allow camera access or upload a file instead.';
  }
}

function closeCamera(): void {
  if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
  cameraStream = null;
  el('camera-panel').classList.add('hidden');
  setActionButton('Use camera', openCamera);
}

function capturePhoto(): void {
  const video = el<HTMLVideoElement>('camera-video');
  if (!video || !video.videoWidth) return;
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d')!.drawImage(video, 0, 0);
  canvas.toBlob(blob => {
    if (!blob) return;
    const file = new File([blob], 'camera.jpg', { type: 'image/jpeg' });
    const dt = new DataTransfer();
    dt.items.add(file);
    const input = el<HTMLInputElement>('photo-input');
    input.files = dt.files;
    closeCamera();
    showLocalPreview(input);
    input.form!.requestSubmit();
  }, 'image/jpeg', 0.9);
}

// ---- instant local preview (shown while the server segments) ----
let previewUrl: string | null = null;

function showLocalPreview(input: HTMLInputElement): void {
  const file = input.files && input.files[0];
  if (!file) return;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  document.getElementById('uploader')?.classList.add('hidden');
  setActionButton('Detecting ...', null, true);
  const stage = el('stage');
  stage.innerHTML =
    '<div class="preview"><img alt="Your photo">' +
    '<div class="scan-overlay"><span>Detecting ingredients ...</span></div></div>';
  (stage.querySelector('img') as HTMLImageElement).src = previewUrl;
}

// ---- desktop drag-and-drop (hidden file inputs do not receive drops) ----
document.addEventListener('DOMContentLoaded', () => {
  const zone = document.querySelector<HTMLElement>('.dropzone');
  const input = document.getElementById('photo-input') as HTMLInputElement | null;
  if (!zone || !input) return;
  (['dragenter', 'dragover'] as const).forEach(type =>
    zone.addEventListener(type, e => { e.preventDefault(); zone.classList.add('dragging'); }));
  (['dragleave', 'drop'] as const).forEach(type =>
    zone.addEventListener(type, e => { e.preventDefault(); zone.classList.remove('dragging'); }));
  zone.addEventListener('drop', e => {
    const file = e.dataTransfer?.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    showLocalPreview(input);
    input.form!.requestSubmit();
  });
});

// ---- recipe typewriter (fragment calls this after swap) ----
function typeRecipe(): void {
  const store = document.getElementById('recipe-store') as HTMLTextAreaElement | null;
  const target = document.getElementById('recipe-text');
  if (!store || !target) return;
  const text = store.value;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    target.textContent = text;
    return;
  }
  const cursor = document.createElement('span');
  cursor.className = 'cursor';
  cursor.textContent = '|';
  let i = 0;
  const tick = () => {
    i += 2;
    target.textContent = text.slice(0, i);
    target.appendChild(cursor);
    if (i < text.length) window.setTimeout(tick, 12);
  };
  tick();
}
