from pdf2image import convert_from_path
from pathlib import Path
import pytesseract
import numpy as np
import time

def pdf_to_text(pdf_path, output_folder, lang="dan", include_confidence=True):
    # Convert PDF to images
    images = convert_from_path(pdf_path)
    extracted_text = ""
    confidence_scores = []  # To store average confidence per page when needed
    
    # Ensure the output folder exists
    output_folder.mkdir(parents=True, exist_ok=True)
    
    # Start the timer before processing begins
    start_time = time.time()

    # Process each page (image)
    for i, image in enumerate(images):
        if include_confidence:
            # Use image_to_data to get detailed OCR info including confidence
            ocr_data = pytesseract.image_to_data(image, lang=lang, output_type=pytesseract.Output.DATAFRAME)
            # Filter out rows with invalid confidence values (-1)
            valid_data = ocr_data[ocr_data.conf != -1]
            
            # Calculate the average confidence for the page if data exists
            if not valid_data.empty:
                avg_confidence = np.mean(valid_data.conf)
            else:
                avg_confidence = 0
                
            confidence_scores.append(avg_confidence)
            print(f"Page {i + 1}: Confidence Score = {avg_confidence:.2f}%")
            
            # Extract text by joining the words detected
            page_text = " ".join(valid_data.text.dropna())
        else:
            # Simply extract text without computing confidence
            page_text = pytesseract.image_to_string(image, lang=lang)
        
        extracted_text += f"\n--- Page {i + 1} ---\n{page_text}\n"
    
    # Save the extracted text to a file
    text_file_path = output_folder / "extracted_text.txt"
    with text_file_path.open("w", encoding="utf-8") as text_file:
        text_file.write(extracted_text)
    
    # Calculate total elapsed time
    elapsed_time = time.time() - start_time

    # If confidence was calculated, print the overall average confidence score
    if include_confidence and confidence_scores:
        overall_avg_confidence = np.mean(confidence_scores)
        print(f"\nOverall Average Confidence Score: {overall_avg_confidence:.2f}%")
    
    print(f"Total Processing Time: {elapsed_time:.2f} seconds")

# Example usage:
pdf_path = Path("Files/policer-Raw/Husforsikring - Ornevej 45.pdf")  # Replace with your PDF file path
output_folder = Path("Files/Policer")  # Ensure this is a directory

# Set include_confidence=True to compute and print confidence scores,
# or include_confidence=False to only extract text.
pdf_to_text(pdf_path, output_folder, lang="dan", include_confidence=True)