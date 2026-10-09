import hashlib
import hmac
import os

from flask import Flask, render_template, request, jsonify
from werkzeug.exceptions import RequestEntityTooLarge

app = Flask(__name__)

# Maximum combined request size: 50 MB
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024

CHUNK_SIZE = 1024 * 1024


def calculate_hash(file_stream, algorithm):
    """Calculate a file hash without loading it entirely into memory."""

    hasher = hashlib.new(algorithm)

    file_stream.seek(0)

    while True:
        chunk = file_stream.read(CHUNK_SIZE)

        if not chunk:
            break

        hasher.update(chunk)

    file_stream.seek(0)

    return hasher.hexdigest()


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/hash", methods=["POST"])
def generate_hash():
    uploaded_file = request.files.get("file")

    if not uploaded_file or not uploaded_file.filename:
        return jsonify({"error": "Please select a file."}), 400

    try:
        file_size = 0
        md5_hash = hashlib.md5()
        sha256_hash = hashlib.sha256()

        while True:
            chunk = uploaded_file.stream.read(CHUNK_SIZE)

            if not chunk:
                break

            file_size += len(chunk)
            md5_hash.update(chunk)
            sha256_hash.update(chunk)

        return jsonify({
            "filename": os.path.basename(uploaded_file.filename),
            "size": file_size,
            "md5": md5_hash.hexdigest(),
            "sha256": sha256_hash.hexdigest()
        })

    except OSError:
        return jsonify({"error": "Unable to read the uploaded file."}), 400


@app.route("/api/compare", methods=["POST"])
def compare_files():
    file1 = request.files.get("file1")
    file2 = request.files.get("file2")

    if (
        not file1 or not file1.filename
        or not file2 or not file2.filename
    ):
        return jsonify({
            "error": "Please upload both files."
        }), 400

    try:
        hash1 = calculate_hash(file1.stream, "sha256")
        hash2 = calculate_hash(file2.stream, "sha256")

        identical = hmac.compare_digest(hash1, hash2)

        return jsonify({
            "identical": identical,
            "file1": os.path.basename(file1.filename),
            "file2": os.path.basename(file2.filename),
            "sha256_1": hash1,
            "sha256_2": hash2
        })

    except OSError:
        return jsonify({
            "error": "Unable to read the uploaded files."
        }), 400


@app.errorhandler(RequestEntityTooLarge)
def file_too_large(error):
    return jsonify({
        "error": "The upload exceeds the 50 MB request limit."
    }), 413


if __name__ == "__main__":
    app.run(debug=True)

