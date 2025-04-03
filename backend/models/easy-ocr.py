import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

from pdf2image import convert_from_path
from pathlib import Path
import easyocr
import numpy as np
import time
import cv2  # For image conversion if needed
import json
import csv

def pdf_to_text(pdf_path, output_folder, lang="dan", include_confidence=True):
    # Convert PDF pages to images
    images = convert_from_path(pdf_path)
    extracted_text = ""
    confidence_scores = []  # To store average confidence per page

    # Ensure the output folder exists
    output_folder.mkdir(parents=True, exist_ok=True)
    
    # EasyOCR uses "da" for Danish language
    lang_code = "da" if lang.lower() in ["dan", "danish"] else lang
    
    # Initialize the EasyOCR Reader (GPU parameters removed)
    reader = easyocr.Reader([lang_code])
    
    # Start the timer
    start_time = time.time()
    total_pages = len(images)
    progress_file = os.path.join("Files", "ProgressBar", "progress.json")

    # Process each image (page)
    for i, image in enumerate(images):
        # Convert PIL image to a NumPy array
        image_np = np.array(image)
        
        if include_confidence:
            results = reader.readtext(image_np, detail=1)
            page_text = ""
            page_confidences = []
            for bbox, text, conf in results:
                page_text += text + " "
                page_confidences.append(conf * 100)  # Convert to percentage
            avg_conf = np.mean(page_confidences) if page_confidences else 0
            confidence_scores.append(avg_conf)
            print(f"Page {i + 1}: Confidence Score = {avg_conf:.2f}%")
        else:
            results = reader.readtext(image_np, detail=0)
            page_text = " ".join(results)
        
        extracted_text += f"\n--- Page {i + 1} ---\n{page_text}\n"
        
        # 🔁 Update progress JSON with OCR progress
        ocr_progress = round((i + 1) / total_pages, 4)
        ocr_status = f"Behandler side {i + 1} af {total_pages}"
        
        # Preserve existing main progress if present
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

    # Save the extracted text to a file (using the PDF file's stem as filename)
    text_filename = pdf_path.stem + ".txt"
    text_file_path = output_folder / text_filename
    with text_file_path.open("w", encoding="utf-8") as text_file:
        text_file.write(extracted_text)
    
    elapsed_time = time.time() - start_time

    if include_confidence and confidence_scores:
        overall_avg_conf = np.mean(confidence_scores)
        print(f"\n{pdf_path.name} - Overall Average Confidence Score: {overall_avg_conf:.2f}%")
    else:
        overall_avg_conf = "N/A"
    
    print(f"{pdf_path.name} - Processing Time: {elapsed_time:.2f} seconds")
    
    # ✅ Final update: mark OCR complete
    with open(progress_file, "w", encoding="utf-8") as f:
        json.dump({
            "ocr": {"progress": 1.0, "status": "Scanning færdig"},
            "main": {"progress": main_progress, "status": main_status}
        }, f, ensure_ascii=False)

    # --- Testing log: Save results to CSV ---
    results_file = Path("Files/easyocr_results.csv")
    results_file.parent.mkdir(parents=True, exist_ok=True)
    write_header = not results_file.exists()
    with results_file.open("a", newline='', encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        if write_header:
            writer.writerow(["pdf_name", "total_time", "confidence_per_page", "average_confidence"])
        conf_per_page_str = ",".join([f"{conf:.2f}" for conf in confidence_scores]) if confidence_scores else ""
        avg_conf = overall_avg_conf if isinstance(overall_avg_conf, float) else overall_avg_conf
        writer.writerow([pdf_path.name, f"{elapsed_time:.2f}", conf_per_page_str, f"{avg_conf:.2f}" if isinstance(avg_conf, float) else avg_conf])

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

# Example usage:
if __name__ == "__main__":
    process_all_pdfs(lang="dan", include_confidence=True)
