import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

from pdf2image import convert_from_path
from pathlib import Path
import easyocr
import numpy as np
import time
import cv2  # For image conversion if needed
import torch  # Used to check GPU availability

def pdf_to_text(pdf_path, output_folder, lang="dan", include_confidence=True, use_gpu=True):
    # Check for GPU availability
    if use_gpu:
        if torch.cuda.is_available():
            print("CUDA GPU is available. Using GPU for OCR.")
        else:
            print("CUDA GPU is not available. Running on CPU.")
            use_gpu = False  # Fallback to CPU

    # Convert PDF pages to images
    images = convert_from_path(pdf_path)
    extracted_text = ""
    confidence_scores = []  # To store average confidence per page

    # Ensure the output folder exists
    output_folder.mkdir(parents=True, exist_ok=True)
    
    # EasyOCR uses "da" for Danish language
    lang_code = "da" if lang.lower() in ["dan", "danish"] else lang
    
    # Initialize the EasyOCR Reader with GPU parameter
    reader = easyocr.Reader([lang_code], gpu=use_gpu)
    
    # Start the timer
    start_time = time.time()

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

    # Save the extracted text to a file
    text_file_path = output_folder / "extracted_text.txt"
    with text_file_path.open("w", encoding="utf-8") as text_file:
        text_file.write(extracted_text)
    
    # Calculate elapsed time
    elapsed_time = time.time() - start_time

    if include_confidence and confidence_scores:
        overall_avg_conf = np.mean(confidence_scores)
        print(f"\nOverall Average Confidence Score: {overall_avg_conf:.2f}%")
    
    print(f"Total Processing Time: {elapsed_time:.2f} seconds")

# Example usage:
pdf_path = Path("Files/policer-Raw/Husforsikring - Ornevej 45.pdf")  # Replace with your PDF file path
output_folder = Path("Files/Policer")  # Ensure this is a directory
pdf_to_text(pdf_path, output_folder, lang="dan", include_confidence=True, use_gpu=True)
