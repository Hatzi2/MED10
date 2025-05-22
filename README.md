# Document Processing Application

This is a repository for comprehensive document processing application designed to extract, analyze, and manage information from a variety of document formats, including PDFs and images. Leveraging advanced OCR technologies such as Tesseract, as well as machine learning search models like FAISS, this application streamlines the workflow for digitizing, validating, and organizing documents. The system features a Python backend for processing and a modern React web-based frontend for user interaction.

# Setup Guide

## Table of Contents
- [OCR Setup](#ocr-setup)
  - [Tesseract OCR](#tesseract-ocr)
- [Python Environment Setup](#python-environment-setup)
- [License](#license)

## OCR Setup

### Tesseract OCR
To set up Tesseract OCR, follow these steps:

1. **Download and Install the Tesseract-OCR.exe:**
   - GitHub: [UB Mannheim Tesseract Wiki](https://github.com/UB-Mannheim/tesseract/wiki)
   - During installation, ensure to check the boxes for additional languages if desired.

2. **Add Tesseract to PATH:**
   - Ensure the Tesseract-OCR directory is added to your system's PATH environment variable.
     - **Windows**: Press the Windows button and search for "Edit the system environment variables". Click "Environment Variables". Under System Variables, find PATH, double-click and press "New". Add the path to the Tesseract-OCR directory (e.g., C:\Program Files\Tesseract-OCR).
   - Alternatively, follow the guide on GeeksforGeeks for using OCR: [GeeksforGeeks OCR Setup](https://www.geeksforgeeks.org/python-reading-contents-of-pdf-using-ocr-optical-character-recognition/)


## Python Environment Setup

To set up Python packages for your environment, follow these steps:

1. **Install the requirements.txt file:**
    - Use the following command to install the requirements.txt file:
    ```bash
     pip install -r requirements.txt
     ```


## Installing NODE JS

[Download Node Version Manager] NVM Setup.Exe (https://github.com/coreybutler/nvm-windows/releases)
Open CMD and run the following commands: nvm install 20.11.1 -> nvm use 20.11.1 -> Verify: node -v -> You should see something like: "v20.11.1"

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
