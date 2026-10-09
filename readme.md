# HashVault - File Hash Generator

HashVault is a web-based file integrity verification
tool built using Python and Flask.

## Features

- Generate MD5 checksums
- Generate SHA-256 checksums
- Compare two files
- Drag-and-drop file upload
- Copy checksums
- Download checksum reports
- Responsive dark-mode interface

## Technologies Used

- Python
- Flask
- HTML
- CSS
- JavaScript

## Installation

1. Clone the repository.
2. Install dependencies:

   pip install -r requirements.txt

3. Start the application:

   python app.py

4. Open http://127.0.0.1:5000 in your browser.

## Security

SHA-256 is recommended for file integrity verification.
MD5 is included for demonstration and compatibility.

Uploaded files are processed in memory by the application
rather than deliberately saved to disk.
