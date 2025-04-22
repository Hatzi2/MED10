from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import subprocess
import json
import os
import random

app = Flask(__name__)
app.config["JSON_AS_ASCII"] = False
CORS(app)

# Pre-sample 5 PDFs at startup
PDF_DIR = os.path.join(os.path.dirname(app.root_path), 'Files', 'policer-Raw')
_all_pdfs = [f for f in os.listdir(PDF_DIR) if f.lower().endswith('.pdf')]
SAMPLED_FILES = random.sample(_all_pdfs, min(5, len(_all_pdfs)))

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
    # Always return the same sample picked at startup
    return jsonify(SAMPLED_FILES)

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

@app.route("/delete-brandpolice-files", methods=["POST"])
def delete_brandpolice_files():
    data = request.get_json()
    filename = data.get("filename")
    if not filename:
        return jsonify({"error": "Filename not provided"}), 400

    base = os.path.splitext(filename)[0]
    json_path = os.path.join("Files", "Output", f"{base}.json")
    txt_path = os.path.join("Files", "Policer", f"{base}.txt")
    
    errors = []
    
    try:
        if os.path.exists(json_path):
            os.remove(json_path)
    except Exception as e:
        errors.append(str(e))
    
    try:
        if os.path.exists(txt_path):
            os.remove(txt_path)
    except Exception as e:
        errors.append(str(e))
    
    if errors:
        return jsonify({"error": errors}), 500

    return jsonify({"status": "deleted"}), 200

@app.route("/save-timetrack", methods=["POST"])
def save_timetrack():
    data = request.get_json()
    filename = data.get("filename")
    time_taken = data.get("time")
    action = data.get("action")
    if not filename or time_taken is None or not action:
        return jsonify({"error": "Missing required fields"}), 400

    timetrack_file = os.path.join("Files", "timetrack.json")
    records = {}
    if os.path.exists(timetrack_file):
        try:
            with open(timetrack_file, "r", encoding="utf-8") as f:
                records = json.load(f)
        except Exception:
            records = {}
    records[filename] = {"time": time_taken, "action": action}
    try:
        with open(timetrack_file, "w", encoding="utf-8") as f:
            json.dump(records, f, ensure_ascii=False, indent=4)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    return jsonify({"status": "saved", "record": records[filename]}), 200

if __name__ == "__main__":
    app.run(port=5000)
