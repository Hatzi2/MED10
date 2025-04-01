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
        subprocess.run(["python", "backend\main.py", filename])

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


if __name__ == "__main__":
    app.run(port=5000)
