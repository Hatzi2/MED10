from pdf2image import convert_from_path
from pathlib import Path
import pytesseract
import os

def pdf_to_text(pdf_path, output_folder, lang="dan"):
    # Convert PDF to images
    images = convert_from_path(pdf_path)
    extracted_text = ""
    
    # Ensure the output folder exists
    output_folder.mkdir(parents=True, exist_ok=True)  # Create the folder if it doesn't exist
    
    # Process each image
    for i, image in enumerate(images):
        text = pytesseract.image_to_string(image, lang=lang)  # Specify Danish language
        extracted_text += f"\n--- Page {i + 1} ---\n{text}\n"
    
    # Save extracted text to a file
    text_file_path = output_folder / "extracted_text.txt"  # Corrected path usage
    with text_file_path.open("w", encoding="utf-8") as text_file:
        text_file.write(extracted_text)
    
    print(f"Text extracted and saved to {text_file_path}")
    return extracted_text

# Example usage
pdf_path = Path("Files\policer-Raw\Husforsikring - Ornevej 45.pdf")  # Replace with your PDF file path
output_folder = Path("Files\Policer")  # Ensure this is a directory
extracted_text = pdf_to_text(pdf_path, output_folder, lang="dan")
print(extracted_text)

