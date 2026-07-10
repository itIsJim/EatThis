"use strict";
/* The only hand-written client code in EatThis: theme toggle + camera capture.
   TypeScript source of truth — compile with:
     npx -y typescript@latest --target es2019 --outFile web/static/app.js web/ts/app.ts
   Everything else is server-rendered HTML driven by htmx. */
// ---- theme ----
function toggleTheme() {
    const dark = document.documentElement.classList.toggle('dark');
    try {
        localStorage.setItem('theme', dark ? 'dark' : 'light');
    }
    catch { /* private mode */ }
    const btn = document.getElementById('theme-btn');
    if (btn)
        btn.textContent = dark ? '○' : '●';
}
// ---- camera ----
let cameraStream = null;
function el(id) {
    return document.getElementById(id);
}
async function openCamera() {
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }, audio: false,
        });
        el('camera-video').srcObject = cameraStream;
        el('camera-panel').classList.remove('hidden');
        el('camera-open').classList.add('hidden');
    }
    catch {
        el('status-text').textContent =
            'Could not access the camera. Please allow camera access or upload a file instead.';
    }
}
function closeCamera() {
    if (cameraStream)
        cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
    el('camera-panel').classList.add('hidden');
    el('camera-open').classList.remove('hidden');
}
function capturePhoto() {
    const video = el('camera-video');
    if (!video || !video.videoWidth)
        return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(blob => {
        if (!blob)
            return;
        const file = new File([blob], 'camera.jpg', { type: 'image/jpeg' });
        const dt = new DataTransfer();
        dt.items.add(file);
        const input = el('photo-input');
        input.files = dt.files;
        closeCamera();
        input.form.requestSubmit();
    }, 'image/jpeg', 0.9);
}
