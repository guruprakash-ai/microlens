const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Ensure directories exist
if (!fs.existsSync('./public/uploads')) fs.mkdirSync('./public/uploads', { recursive: true });
if (!fs.existsSync('./database')) fs.mkdirSync('./database', { recursive: true });

// Configure Multer for preserving file extensions
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: (req, file, cb) => {
        cb(null, 'macro-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

app.use(express.static('public'));
app.use(express.json());

// Initialize SQLite Database with DDL Constraints
const db = new sqlite3.Database('./database/microlens.db');
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS specimens (
            specimen_id INTEGER PRIMARY KEY AUTOINCREMENT,
            image_url VARCHAR(255) NOT NULL,
            common_name VARCHAR(100) NOT NULL,
            scientific_name VARCHAR(150) NOT NULL,
            taxonomy_family VARCHAR(100),
            category VARCHAR(50) CHECK (category IN ('Insect', 'Arachnid', 'Flora', 'Reptile', 'Other')),
            camera_model VARCHAR(100),
            shutter_speed VARCHAR(50),
            aperture VARCHAR(20),
            iso VARCHAR(20),
            color_palette TEXT NOT NULL,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
});

// Route 1: Upload & Analyze Photo with Python
app.post('/api/analyze', upload.single('photo'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    const imagePath = req.file.path;
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const pyProcess = spawn(pythonCmd, ['python_engine/processor.py', imagePath]);

    let resultData = '';
    let errorData = '';

    pyProcess.stdout.on('data', (data) => { resultData += data.toString(); });
    pyProcess.stderr.on('data', (data) => { errorData += data.toString(); });

    pyProcess.on('close', (code) => {
        if (code !== 0) {
            console.error('Python Error:', errorData);
            return res.status(500).json({ error: 'Python processing failed' });
        }
        try {
            const parsed = JSON.parse(resultData);
            res.json({
                imageUrl: `/uploads/${req.file.filename}`,
                ...parsed
            });
        } catch (err) {
            res.status(500).json({ error: 'Failed to parse Python response' });
        }
    });
});

// Route 2: Save Specimen to SQLite Journal
app.post('/api/specimens', (req, res) => {
    const {
        image_url, common_name, scientific_name, taxonomy_family,
        category, camera_model, shutter_speed, aperture, iso, color_palette, notes
    } = req.body;

    const sql = `
        INSERT INTO specimens 
        (image_url, common_name, scientific_name, taxonomy_family, category, camera_model, shutter_speed, aperture, iso, color_palette, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
        image_url, common_name, scientific_name, taxonomy_family,
        category, camera_model, shutter_speed, aperture, iso,
        JSON.stringify(color_palette), notes
    ];

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ specimen_id: this.lastID, message: 'Specimen cataloged!' });
    });
});

// Route 3: Fetch All Cataloged Specimens
app.get('/api/specimens', (req, res) => {
    db.all(`SELECT * FROM specimens ORDER BY created_at DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const formatted = rows.map(r => ({
            ...r,
            color_palette: JSON.parse(r.color_palette)
        }));
        res.json(formatted);
    });
});

// Route 4: Delete a Specimen
app.delete('/api/specimens/:id', (req, res) => {
    db.run(`DELETE FROM specimens WHERE specimen_id = ?`, [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

app.listen(PORT, () => {
    console.log(`🌿 MicroLens Server live at http://localhost:${PORT}`);
});