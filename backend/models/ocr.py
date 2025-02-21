from pdf2image import convert_from_path
import pytesseract
import os

def pdf_to_text(pdf_path, output_folder, lang="dan"):
    # Convert PDF to images
    images = convert_from_path(pdf_path)
    extracted_text = ""
    
    # Process each image
    for i, image in enumerate(images):
        text = pytesseract.image_to_string(image, lang=lang)  # Specify Danish language
        extracted_text += f"\n--- Page {i + 1} ---\n{text}\n"
    
    # Save extracted text to a file
    text_file_path = os.path.join(output_folder, "extracted_text.txt")
    with open(text_file_path, "w", encoding="utf-8") as text_file:
        text_file.write(extracted_text)
    
    print(f"Text extracted and saved to {text_file_path}")
    return extracted_text

# Example usage
pdf_path = r"C:\Users\jonas\Desktop\PDFTesting\Husforsikring - Ornevej 45.pdf"  # Replace with your PDF file path
output_folder = r"C:\Users\jonas\Desktop\OutputFolder"  # Output directory
extracted_text = pdf_to_text(pdf_path, output_folder, lang="dan")
print(extracted_text)
