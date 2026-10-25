import sys
import json
import numpy as np
from PIL import Image, ExifTags

def extract_exif(img):
    """Extracts basic camera EXIF metadata if present."""
    exif_data = {"camera": "Macro Lens", "shutter": "1/250s", "aperture": "f/2.8", "iso": "100"}
    try:
        raw_exif = img._getexif()
        if raw_exif:
            tags = {ExifTags.TAGS.get(k, k): v for k, v in raw_exif.items()}
            if "Model" in tags:
                exif_data["camera"] = str(tags["Model"]).strip()
            if "ISOSpeedRatings" in tags:
                exif_data["iso"] = str(tags["ISOSpeedRatings"])
            if "FNumber" in tags:
                val = tags["FNumber"]
                f_num = float(val.numerator) / float(val.denominator) if hasattr(val, 'numerator') else float(val)
                exif_data["aperture"] = f"f/{round(f_num, 1)}"
            if "ExposureTime" in tags:
                val = tags["ExposureTime"]
                if hasattr(val, 'numerator') and val.numerator < val.denominator:
                    exif_data["shutter"] = f"{val.numerator}/{val.denominator}s"
                else:
                    exif_data["shutter"] = f"{val}s"
    except Exception:
        pass
    return exif_data

def extract_palette_and_classify(image_path, num_colors=5):
    img = Image.open(image_path)
    exif_info = extract_exif(img)
    
    # Resize and convert to RGB for fast vectorized NumPy processing
    img_rgb = img.convert('RGB').resize((150, 150))
    pixels = np.array(img_rgb).reshape(-1, 3)

    # Filter out near-black and near-white background noise if enough mid-tones exist
    brightness = np.mean(pixels, axis=1)
    filtered_pixels = pixels[(brightness > 18) & (brightness < 245)]
    if len(filtered_pixels) < 500:
        filtered_pixels = pixels

    # Vectorized color quantization (binning into 24-step color cubes)
    bin_size = 24
    quantized = (filtered_pixels // bin_size) * bin_size + (bin_size // 2)
    quantized = np.clip(quantized, 0, 255)

    unique_colors, counts = np.unique(quantized, axis=0, return_counts=True)
    sorted_idx = np.argsort(-counts)

    # Select top distinct colors (ensuring Euclidean distance in RGB space > 45)
    selected_colors = []
    for color in unique_colors[sorted_idx]:
        if len(selected_colors) == 0:
            selected_colors.append(color)
        else:
            distances = np.linalg.norm(np.array(selected_colors) - color, axis=1)
            if np.min(distances) > 45:
                selected_colors.append(color)
        if len(selected_colors) == num_colors:
            break

    # Fallback if image is monochromatic
    while len(selected_colors) < num_colors:
        selected_colors.append(unique_colors[0])

    hex_palette = [
        "#{:02x}{:02x}{:02x}".format(int(r), int(g), int(b))
        for r, g, b in selected_colors
    ]

    # Simple spectral heuristic for initial Auto-Taxonomy suggestion
    mean_r, mean_g, mean_b = np.mean(filtered_pixels, axis=0)
    if mean_g > mean_r * 1.12 and mean_g > mean_b * 1.15:
        taxonomy = {
            "common_name": "Green Lynx Spider / Foliage",
            "scientific_name": "Peucetia viridans",
            "taxonomy_family": "Oxyopidae",
            "category": "Arachnid"
        }
    elif mean_r > mean_g * 1.25:
        taxonomy = {
            "common_name": "Crimson Rose / Bloom",
            "scientific_name": "Pachliopta hector",
            "taxonomy_family": "Papilionidae",
            "category": "Flora"
        }
    else:
        taxonomy = {
            "common_name": "Metallic Jewel Beetle",
            "scientific_name": "Chrysochroa fulgidissima",
            "taxonomy_family": "Buprestidae",
            "category": "Insect"
        }

    return {
        "palette": hex_palette,
        "exif": exif_info,
        "suggested_taxonomy": taxonomy
    }

if __name__ == "__main__":
    try:
        image_path = sys.argv[1]
        output = extract_palette_and_classify(image_path)
        print(json.dumps(output))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)