from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import json
import os

app = Flask(__name__)
CORS(app)

@app.route("/run-script", methods=["POST"])
def run_script():
    # Run the script that creates output_results.json
    subprocess.run(["python", "Python/main.py"])

    # Load the JSON data and return it
    output_path = "Files/output_results.json"
    if os.path.exists(output_path):
        with open(output_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return jsonify(data)
    else:
        return jsonify({"error": "Output file not found"}), 500

if __name__ == "__main__":
    app.run(port=5000)
