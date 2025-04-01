from pdf2image import convert_from_path
from pathlib import Path
import pytesseract
import numpy as np
import time

def pdf_to_text(pdf_path, output_folder, lang="dan", include_confidence=True):
    images = convert_from_path(pdf_path)
    extracted_text = ""
    confidence_scores = []

    output_folder.mkdir(parents=True, exist_ok=True)
    start_time = time.time()

    for i, image in enumerate(images):
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

    # Save using the PDF's name
    text_filename = pdf_path.stem + ".txt"
    text_file_path = output_folder / text_filename
    with text_file_path.open("w", encoding="utf-8") as text_file:
        text_file.write(extracted_text)

    elapsed_time = time.time() - start_time

    if include_confidence and confidence_scores:
        overall_avg_confidence = np.mean(confidence_scores)
        print(f"\n{pdf_path.name} - Overall Average Confidence: {overall_avg_confidence:.2f}%")

    print(f"{pdf_path.name} - Processing Time: {elapsed_time:.2f} seconds")


def process_all_pdfs(input_folder, output_folder, lang="dan", include_confidence=True):
    input_folder = Path(input_folder)
    output_folder = Path(output_folder)

    for pdf_file in input_folder.glob("*.pdf"):
        output_text_file = output_folder / (pdf_file.stem + ".txt")
        if output_text_file.exists():
            print(f"Skipping {pdf_file.name} (already extracted)")
        else:
            print(f"\nProcessing {pdf_file.name}...")
            pdf_to_text(pdf_file, output_folder, lang=lang, include_confidence=include_confidence)


# Example usage:
input_folder = Path("Files/policer-Raw")
output_folder = Path("Files/Policer")

process_all_pdfs(input_folder, output_folder, lang="dan", include_confidence=True)
