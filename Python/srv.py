from flask import Flask
from flask_cors import CORS
import subprocess

app = Flask(__name__)
CORS(app)

@app.route("/run-script", methods=["POST"])
def run_script():
    subprocess.run(["python", "Python/main.py"])
    return {"status": "success"}

if __name__ == "__main__":
    app.run(port=5000)
