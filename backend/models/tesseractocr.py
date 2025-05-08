from pdf2image import convert_from_path
from pathlib import Path
import pytesseract
import numpy as np
import json
import time
import os
from PIL import ImageDraw
import pandas as pd

def erase_from_text_start(image, crop_percent=25, buffer_px=10, lang="dan", top_percent=15, right_percent=100, debug_save_path=None):
    """Highlight areas with semi-transparent red/yellow directly on RGB image before erasing."""
    import pytesseract
    from PIL import ImageDraw

    ocr_data = pytesseract.image_to_data(image, lang=lang, output_type=pytesseract.Output.DATAFRAME)
    valid_data = ocr_data[(ocr_data.conf != -1) & (ocr_data.text.notna()) & (ocr_data.text.str.strip() != "")]

    if valid_data.empty:
        print("⚠️ No valid text detected. Skipping blanking.")
        return image

    width, height = image.size
    right_x_start = int(width * (1 - right_percent / 100))
    top_y_end = int(height * (top_percent / 100))

    draw = ImageDraw.Draw(image, "RGBA")

    # ✅ Draw semi-transparent red (exclusion zone)
    draw.rectangle([(right_x_start, 0), (width, top_y_end)], fill=(255, 0, 0, 100))

    filtered_data = valid_data[
        ~(
            (valid_data.left >= right_x_start) &
            (valid_data.top <= top_y_end)
        )
    ]

    if filtered_data.empty:
        print("⚠️ All text was in the exclusion zone. Skipping blanking.")
        return image

    start_y_raw = filtered_data['top'].min()
    erase_y_start = max(0, start_y_raw - buffer_px)
    crop_height = int(height * (crop_percent / 100.0))
    erase_y_end = min(height, erase_y_start + crop_height)

    # ✅ Draw semi-transparent yellow (erase zone)
    draw.rectangle([(0, erase_y_start), (width, erase_y_end)], fill=(255, 255, 0, 100))

    # ✅ Save before white-out
    if debug_save_path:
        image.save(debug_save_path)
        print(f"✅ Debug image saved to {debug_save_path}")

    # ✅ Now actually erase
    draw.rectangle([(0, erase_y_start), (width, erase_y_end)], fill="white")

    print(f"✂️ Blanked from Y={erase_y_start}px to Y={erase_y_end}px (text starts at Y={start_y_raw}, adjusted up by {buffer_px}px)")
    return image


def pdf_to_text(pdf_path, output_folder, lang="dan", include_confidence=True):
    from pdf2image import convert_from_path
    import numpy as np
    import pytesseract
    import json
    import os
    import time

    images = convert_from_path(pdf_path)
    extracted_text = ""
    confidence_scores = []

    output_folder.mkdir(parents=True, exist_ok=True)
    start_time = time.time()

    total_pages = len(images)
    progress_file = os.path.join("Files", "ProgressBar", "progress.json")

    for i, image in enumerate(images):
        if i == 0:
            debug_image_path = output_folder / f"{pdf_path.stem}_page1_debug.png"
            image = erase_from_text_start(image, crop_percent=5, buffer_px=10, lang=lang, debug_save_path=debug_image_path)



        if i == 0:
            print(f"Saved page {i + 1} image to {debug_image_path}")

        # OCR processing
        if include_confidence:
            ocr_data = pytesseract.image_to_data(image, lang=lang, output_type=pytesseract.Output.DATAFRAME)
            valid_data = ocr_data[ocr_data.conf != -1]

            avg_confidence = np.mean(valid_data.conf) if not valid_data.empty else 0
            confidence_scores.append(avg_confidence)
            print(f"Page {i + 1}: Confidence Score = {avg_confidence:.2f}%")

            page_text = " ".join(valid_data.text.dropna())
        else:
            page_text = pytesseract.image_to_string(image, lang=lang)

        extracted_text += f"\n--- Page {i + 1} ---\n{page_text}\n"

        # Update progress
        ocr_progress = round((i + 1) / total_pages, 4)
        ocr_status = f"Behandler side {i + 1} af {total_pages}"

        main_progress, main_status = 0.0, "Venter på scanning..."
        if os.path.exists(progress_file):
            try:
                with open(progress_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    main_data = data.get("main", {})
                    main_progress = main_data.get("progress", 0.0)
                    main_status = main_data.get("status", "Venter på scanning...")
            except Exception as e:
                print("⚠️ Could not read existing main progress:", e)

        with open(progress_file, "w", encoding="utf-8") as f:
            json.dump({
                "ocr": {"progress": ocr_progress, "status": ocr_status},
                "main": {"progress": main_progress, "status": main_status}
            }, f, ensure_ascii=False)

    # Save extracted text
    text_filename = pdf_path.stem + ".txt"
    text_file_path = output_folder / text_filename
    with text_file_path.open("w", encoding="utf-8") as text_file:
        text_file.write(extracted_text)

    elapsed_time = time.time() - start_time

    if include_confidence and confidence_scores:
        overall_avg_confidence = np.mean(confidence_scores)
        print(f"\n{pdf_path.name} - Overall Average Confidence: {overall_avg_confidence:.2f}%")

    print(f"{pdf_path.name} - Processing Time: {elapsed_time:.2f} seconds")

    # Final progress update
    with open(progress_file, "w", encoding="utf-8") as f:
        json.dump({
            "ocr": {"progress": 1.0, "status": "Scanning færdig"},
            "main": {"progress": main_progress, "status": main_status}
        }, f, ensure_ascii=False)

def process_all_pdfs(lang="dan", include_confidence=True):
    input_folder = Path("Files/policer-Raw")
    output_folder = Path("Files/Policer")

    for pdf_file in input_folder.glob("*.pdf"):
        output_text_file = output_folder / (pdf_file.stem + ".txt")
        if output_text_file.exists():
            print(f"Skipping {pdf_file.name} (already extracted)")
        else:
            print(f"\nProcessing {pdf_file.name}...")
            pdf_to_text(pdf_file, output_folder, lang=lang, include_confidence=include_confidence)

# Run script
input_folder = Path("Files/policer-Raw")
output_folder = Path("Files/Policer")

process_all_pdfs(lang="dan", include_confidence=True)
