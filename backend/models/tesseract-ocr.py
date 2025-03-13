from pdf2image import convert_from_path
from pathlib import Path
import pytesseract
import numpy as np
import time  # Import time module for tracking execution time

def pdf_to_text(pdf_path, output_folder, lang="dan"):
    # Convert PDF to images
    images = convert_from_path(pdf_path)
    extracted_text = ""
    confidence_scores = []  # List to store confidence scores per page
    
    # Ensure the output folder exists
    output_folder.mkdir(parents=True, exist_ok=True)  # Create the folder if it doesn't exist
    
    # Start timer when processing begins
    start_time = time.time()

    # Process each image
    for i, image in enumerate(images):
        # Perform OCR and get confidence scores
        ocr_data = pytesseract.image_to_data(image, lang=lang, output_type=pytesseract.Output.DATAFRAME)
        
        # Filter out invalid confidence scores (-1)
        valid_data = ocr_data[ocr_data.conf != -1]
        
        # Calculate the average confidence for the page
        if not valid_data.empty:
            avg_confidence = np.mean(valid_data.conf)
        else:
            avg_confidence = 0  # Default to 0 if no valid confidence scores
        
        confidence_scores.append(avg_confidence)
        print(f"Page {i + 1}: Confidence Score = {avg_confidence:.2f}%")  # Print confidence score for each page
        
        # Extract text and store it
        text = " ".join(valid_data.text.dropna())  # Join words into a full text block
        extracted_text += f"\n--- Page {i + 1} ---\n{text}\n"
    
    # Save extracted text to a file
    text_file_path = output_folder / "extracted_text.txt"
    with text_file_path.open("w", encoding="utf-8") as text_file:
        text_file.write(extracted_text)
    
    # Stop timer and calculate elapsed time
    end_time = time.time()
    elapsed_time = end_time - start_time

    # Calculate and print overall average confidence
    if confidence_scores:
        overall_avg_confidence = np.mean(confidence_scores)
    else:
        overall_avg_confidence = 0

    print(f"\nOverall Average Confidence Score: {overall_avg_confidence:.2f}%")
    print(f"Total Processing Time: {elapsed_time:.2f} seconds")

# Example usage
pdf_path = Path("Files/policer-Raw/Husforsikring - Ornevej 45.pdf")  # Replace with your PDF file path
output_folder = Path("Files/Policer")  # Ensure this is a directory
pdf_to_text(pdf_path, output_folder, lang="dan")
