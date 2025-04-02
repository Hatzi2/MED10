from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import json
import os

app = Flask(__name__)
CORS(app)

@app.route("/run-script", methods=["POST"])
def run_script():
    data = request.get_json()
    filename = data.get("filename")

    if not filename:
        return jsonify({"error": "Filename not provided"}), 400

    output_path = f"Files/Output/{os.path.splitext(filename)[0]}.json"

    if not os.path.exists(output_path):
        subprocess.run(["python", "backend/main.py", filename])

    if os.path.exists(output_path):
        with open(output_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return jsonify(data)
    else:
        return jsonify({"error": "Output file not found"}), 500


@app.route("/list-files", methods=["GET"])
def list_files():
    folder_path = "Files/policer-Raw"
    if not os.path.exists(folder_path):
        return jsonify({"error": "Folder not found"}), 404

    file_list = os.listdir(folder_path)
    return jsonify(file_list)

@app.route("/progress", methods=["GET"])
def get_progress():
    filename = request.args.get("filename")
    if not filename:
        return jsonify({
            "ocr": {"progress": 0.0, "status": "Ikke startet"},
            "main": {"progress": 0.0, "status": "Ikke startet"}
        })

    output_path = f"Files/Output/{os.path.splitext(filename)[0]}.json"
    if os.path.exists(output_path):
        return jsonify({
            "ocr": {"progress": 1.0, "status": "Scanning Finitto"},
            "main": {"progress": 1.0, "status": "finitto"}
        })

    progress_file = os.path.join("Files", "ProgressBar", "progress.json")
    if not os.path.exists(progress_file):
        return jsonify({
            "ocr": {"progress": 0.0, "status": "Ikke startet"},
            "main": {"progress": 0.0, "status": "Ikke startet"}
        })

    try:
        with open(progress_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            ocr_progress = data.get("ocr", {"progress": 0.0, "status": ""})
            main_progress = data.get("main", {"progress": 0.0, "status": ""})
            return jsonify({"ocr": ocr_progress, "main": main_progress})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/reset-progress", methods=["POST"])
def reset_progress():
    progress_file = os.path.join("Files", "ProgressBar", "progress.json")
    os.makedirs(os.path.dirname(progress_file), exist_ok=True)
    with open(progress_file, "w", encoding="utf-8") as f:
        json.dump({
            "ocr": {"progress": 0.0, "status": "Starter scanning..."},
            "main": {"progress": 0.0, "status": "YEP"}
        }, f)
    return jsonify({"status": "reset"}), 200


if __name__ == "__main__":
    app.run(port=5000)
