let currentImageUrl = 'https://images.unsplash.com/photo-1557180295-76eee20ae8aa?auto=format&fit=crop&w=800&q=80';
let currentPalette = ['#2b4c1c', '#558b2f', '#9ccc65', '#795548', '#d7ccc8'];

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const uploadStatus = document.getElementById('uploadStatus');

// Trigger file picker
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleFileUpload(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleFileUpload(e.target.files[0]);
});

async function handleFileUpload(file) {
    uploadStatus.textContent = '⏳ Analyzing pixel array with NumPy & reading EXIF...';
    const formData = new FormData();
    formData.append('photo', file);

    try {
        const res = await fetch('/api/analyze', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        currentImageUrl = data.imageUrl;
        currentPalette = data.palette;

        // Update Image & Palette
        document.getElementById('previewImage').src = currentImageUrl;
        renderPaletteStrip(currentPalette);

        // Populate Form Inputs with Auto-Taxonomy & EXIF
        document.getElementById('commonName').value = data.suggested_taxonomy.common_name;
        document.getElementById('scientificName').value = data.suggested_taxonomy.scientific_name;
        document.getElementById('taxonomyFamily').value = data.suggested_taxonomy.taxonomy_family;
        document.getElementById('category').value = data.suggested_taxonomy.category;

        document.getElementById('cameraModel').value = data.exif.camera;
        document.getElementById('shutterSpeed').value = data.exif.shutter;
        document.getElementById('aperture').value = data.exif.aperture;
        document.getElementById('iso').value = data.exif.iso;

        syncCardPreview();
        uploadStatus.textContent = '✅ Palette & Taxonomy extracted!';
    } catch (err) {
        uploadStatus.textContent = '❌ Error: ' + err.message;
    }
}

function renderPaletteStrip(paletteArray) {
    const strip = document.getElementById('paletteStrip');
    strip.innerHTML = paletteArray.map(hex => `
        <div class="palette-swatch" style="background: ${hex}" title="Click to copy ${hex}" onclick="navigator.clipboard.writeText('${hex}')">
            ${hex}
        </div>
    `).join('');
}

// Live two-way binding between form inputs and the Field Card preview
const formIds = ['commonName', 'scientificName', 'taxonomyFamily', 'category', 'cameraModel', 'shutterSpeed', 'aperture', 'iso', 'notes'];
formIds.forEach(id => {
    document.getElementById(id).addEventListener('input', syncCardPreview);
});

function syncCardPreview() {
    document.getElementById('cardCommon').textContent = document.getElementById('commonName').value;
    document.getElementById('cardScientific').textContent = document.getElementById('scientificName').value;
    document.getElementById('cardFamily').textContent = document.getElementById('taxonomyFamily').value;
    document.getElementById('cardCategory').textContent = document.getElementById('category').value;
    document.getElementById('cardCamera').textContent = document.getElementById('cameraModel').value;
    document.getElementById('cardShutter').textContent = document.getElementById('shutterSpeed').value;
    document.getElementById('cardAperture').textContent = document.getElementById('aperture').value;
    document.getElementById('cardIso').textContent = document.getElementById('iso').value;
    const notesVal = document.getElementById('notes').value;
    document.getElementById('cardNotes').textContent = notesVal ? `"${notesVal}"` : '';
}

// Save Specimen to SQLite
document.getElementById('saveBtn').addEventListener('click', async () => {
    const payload = {
        image_url: currentImageUrl,
        common_name: document.getElementById('commonName').value,
        scientific_name: document.getElementById('scientificName').value,
        taxonomy_family: document.getElementById('taxonomyFamily').value,
        category: document.getElementById('category').value,
        camera_model: document.getElementById('cameraModel').value,
        shutter_speed: document.getElementById('shutterSpeed').value,
        aperture: document.getElementById('aperture').value,
        iso: document.getElementById('iso').value,
        color_palette: currentPalette,
        notes: document.getElementById('notes').value
    };

    const res = await fetch('/api/specimens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        loadSpecimens();
    }
});

// One-Click Polaroid PNG Export
document.getElementById('exportBtn').addEventListener('click', async () => {
    const cardElement = document.getElementById('fieldCard');
    const canvas = await html2canvas(cardElement, {
        backgroundColor: '#060d09',
        useCORS: true,
        scale: 2
    });
    const link = document.createElement('a');
    const cleanName = document.getElementById('commonName').value.toLowerCase().replace(/\s+/g, '-');
    link.download = `microlens-${cleanName}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
});

// Load Saved Specimens from SQLite
async function loadSpecimens() {
    const res = await fetch('/api/specimens');
    const items = await res.json();
    const grid = document.getElementById('galleryGrid');

    grid.innerHTML = items.map(item => `
        <div class="field-card">
            <div class="card-image-wrap" style="height: 210px;">
                <img src="${item.image_url}" alt="${item.common_name}">
                <span class="category-badge">${item.category}</span>
            </div>
            <div class="palette-strip">
                ${item.color_palette.map(hex => `<div class="palette-swatch" style="background:${hex}">${hex}</div>`).join('')}
            </div>
            <div class="card-meta-header">
                <div class="card-common-name" style="font-size: 1.05rem;">${item.common_name}</div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">${item.taxonomy_family || ''}</div>
            </div>
            <div class="card-scientific-name" style="font-size: 0.88rem;">${item.scientific_name}</div>
            <div class="exif-bar">
                <div class="exif-item"><span>LENS</span><strong>${item.camera_model}</strong></div>
                <div class="exif-item"><span>SHUTTER</span><strong>${item.shutter_speed}</strong></div>
                <div class="exif-item"><span>APERTURE</span><strong>${item.aperture}</strong></div>
                <div class="exif-item"><span>ISO</span><strong>${item.iso}</strong></div>
            </div>
        </div>
    `).join('');
}

loadSpecimens();