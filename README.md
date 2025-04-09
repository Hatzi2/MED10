# Setup Guide

## Table of Contents
- [OCR Setup](#ocr-setup)
  - [Tesseract OCR](#tesseract-ocr)
  - [Poppler for Windows](#poppler-for-windows)
- [Ollama Setup](#ollama-setup)
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

### Poppler for Windows
To set up Poppler for Windows, follow these steps:

1. **Download and Install Poppler:**
   - GitHub Releases: [Poppler for Windows](https://github.com/oschwartz10612/poppler-windows/releases)

2. **Add Poppler to PATH:**
   - Ensure the Poppler directory is added to your system's PATH environment variable.
     - **Windows**: Press the Windows button and search for "Edit the system environment variables". Click "Environment Variables". Under System Variables, find PATH, double-click and press "New". Add the path to Poppler's bin directory. It's recommended to move the Poppler directory to C:\Program Files. An example of a correct PATH would be C:\Program Files\poppler-24.08.0\Library\bin.

## Ollama Setup

To set up Ollama, follow these steps:

1. **Visit the Ollama Website:**
   - [Ollama](https://ollama.com/)

2. **OPTIONAL: Follow the Comprehensive Guide for Running Ollama on Windows:**
   - Blog Post: [Running Ollama on Windows - A Comprehensive Guide](https://collabnix.com/running-ollama-on-windows-a-comprehensive-guide/)

3. **Run Ollama Command:**
   - Use the following command examples to install the model you intend to use:
     ```bash
     ollama run llama3.2
     ollama run deepseek-r1
     ollama run mistral
     ollama run phi4
     ```

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

## Det herunder er supposedly ikke nødvendigt, bare npm install
In the frontend directory run the following commands in a cmd -> npm install pdfjs-dist@3.0.279 -> npm install @react-pdf-viewer/core@3.12.0 @react-pdf-viewer/default-layout@3.12.0
Dinally -> npm install @react-pdf-viewer/search
## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
