# 🔬 MicroLens — AI-Powered Insect & Flora Macro-Journal

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![NumPy](https://img.shields.io/badge/NumPy-013243?style=for-the-badge&logo=numpy&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![HTML5/CSS3](https://img.shields.io/badge/Glassmorphism_UI-15803d?style=for-the-badge)

**MicroLens** is a full-stack web application designed for nature and wildlife macro photographers to catalog close-up shots of insects, arachnids, leaves, and blooms. Instead of storing images in plain folders, MicroLens uses a hybrid **Node.js + Python** architecture to extract 5-color dominant hex palettes via vectorized NumPy operations, parse camera EXIF metadata, suggest taxonomy classifications, and generate downloadable Polaroid-style field cards.

---

## ✨ Key Features

* **📷 Drag-and-Drop Macro Analyzer:** Reads camera EXIF data (Lens/Model, Shutter Speed, Aperture, ISO) directly from uploaded photographs.
* **🎨 Vectorized NumPy Color Palette Extractor:** Filters out background shadow/highlight noise and performs 3D RGB color quantization using Euclidean distance thresholds to extract the 5 most vibrant dominant hex codes.
* **🦗 Auto-Taxonomy Tagging:** Suggests initial common names, scientific names, and taxonomic families based on spectral analysis.
* **✨ Glassmorphism UI & Live Preview:** Built with frosted glass containers, bioluminescent neon accents, and real-time two-way data binding.
* **🖼️ One-Click Polaroid Field Card Export:** Compiles the macro shot, hex palette strip, EXIF bar, and scientific typography into a high-resolution `.png` card using `html2canvas`.
* **🗄️ Persistent SQLite Field Journal:** Stores specimen metadata locally with strict DDL constraints for instant gallery browsing.

---

## 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3 (Custom Glassmorphism UI), Vanilla JavaScript, `html2canvas`
* **Backend:** Node.js, Express.js, Multer (Multipart file handling), Child Process IPC
* **Image Processing Engine:** Python 3, NumPy, Pillow (PIL)
* **Database:** SQLite3

---

## 📂 Project Structure

```text
microlens/
├── public/
│   ├── css/
│   │   └── glass.css          # Frosted glass styling & Polaroid card layout
│   ├── js/
│   │   └── app.js             # Drag-and-drop, live preview binding, PNG export
│   ├── uploads/               # Local storage for uploaded macro shots
│   └── index.html             # Main dashboard interface
├── python_engine/
│   └── processor.py           # NumPy color quantization, EXIF & taxonomy script
├── database/
│   └── microlens.db           # Auto-generated SQLite database
├── server.js                  # Express API server & Python child_process bridge
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites
Make sure you have **Node.js** and **Python 3** installed on your system.

### 1. Clone the Repository
```bash
git clone [https://github.com/YOUR-USERNAME/microlens.git](https://github.com/YOUR-USERNAME/microlens.git)
cd microlens
```

### 2. Install Dependencies
Install the Node.js backend packages:
```bash
npm install express multer sqlite3 cors
```

Install the Python image processing libraries:
```bash
pip install Pillow numpy
```

### 3. Run the Application
```bash
node server.js
```
Open **`http://localhost:3000`** in your browser.

---

## 📸 How It Works
1. **Upload:** Drop a macro photograph into the dashboard.
2. **Process:** Express saves the file via `multer` and spawns `python_engine/processor.py`.
3. **Quantize:** Pillow resizes the image for rapid processing, and NumPy reshapes the pixel matrix to isolate the 5 most distinct RGB clusters and camera EXIF tags.
4. **Export & Catalog:** Customize the observation notes, export a shareable Polaroid PNG card, or save the specimen to the SQLite database.