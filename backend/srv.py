# -*- coding: utf-8 -*-
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask import send_from_directory
import subprocess
import json
import os

app = Flask(__name__)
app.config["JSON_AS_ASCII"] = False
CORS(app)

@app.route('/pdf/<path:filename>')
def serve_pdf(filename):
    pdf_dir = os.path.join(os.path.dirname(app.root_path), 'Files', 'policer-Raw')
    return send_from_directory(pdf_dir, filename)

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
            "ocr": {"progress": 1.0, "status": "Scanning Færdig"},
            "main": {"progress": 1.0, "status": "Færdig"}
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
            "main": {"progress": 0.0, "status": "Venter på scanning..."}
        }, f, ensure_ascii=False)
    return jsonify({"status": "reset"}), 200

@app.route("/timetrack", methods=["POST"])
def record_time():
    data = request.get_json()
    filename = data.get("filename")
    duration = data.get("duration")
    action = data.get("action")  # "accepter" or "afvis"
    if not filename or duration is None or not action:
        return jsonify({"error": "Filename, duration, or action not provided"}), 400

    # File in which to store the time tracking data.
    timetrack_file = "timetrack.json"
    # Load existing data if available.
    if os.path.exists(timetrack_file):
        with open(timetrack_file, "r", encoding="utf-8") as f:
            track_data = json.load(f)
    else:
        track_data = {}
    
    # Update the entry for the given filename with duration and action.
    track_data[filename] = {
        "duration": duration,
        "action": action
    }

    with open(timetrack_file, "w", encoding="utf-8") as f:
        json.dump(track_data, f, ensure_ascii=False, indent=4)

    return jsonify({"status": "success", "filename": filename, "duration": duration, "action": action})

if __name__ == "__main__":
    app.run(port=5000)
