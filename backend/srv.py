# -*- coding: utf-8 -*-
import os
import json
import random
import subprocess
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
app.config["JSON_AS_ASCII"] = False
CORS(app)

# Global variable to store the selected 5 files.
selected_files = []

def initialize_selected_files():
    global selected_files
    # Construct the full path to the "policer-Raw" folder.
    folder_path = os.path.join(os.path.dirname(app.root_path), 'Files', 'policer-Raw')
    if os.path.exists(folder_path):
        file_list = os.listdir(folder_path)
        # If there are more than 5 files, randomly select 5; otherwise, use all files.
        if len(file_list) > 5:
            selected_files = random.sample(file_list, 5)
        else:
            selected_files = file_list
    else:
        selected_files = []

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
    # Return the preselected list of 5 random files.
    return jsonify(selected_files)

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
    action = data.get("action")  # Expected to be "accepter" or "afvis"
    if not filename or duration is None or not action:
        return jsonify({"error": "Filename, duration, or action not provided"}), 400

    timetrack_file = "timetrack.json"
    # Initialize track_data safely: if file exists, try to load; otherwise, use {}.
    if os.path.exists(timetrack_file):
        try:
            with open(timetrack_file, "r", encoding="utf-8") as f:
                contents = f.read().strip()
                if contents:
                    track_data = json.loads(contents)
                else:
                    track_data = {}
        except Exception:
            track_data = {}
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

# Initialize selected files manually before the first request.
initialize_selected_files()

if __name__ == "__main__":
    app.run(port=5000)
