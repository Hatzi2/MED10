import requests
import os
import psutil
import GPUtil
import threading
import time
import json

# Function to load ground truth data from a JSON file
def load_ground_truth(json_path):
    try:
        with open(json_path, 'r') as f:
            return json.load(f)
    except PermissionError:
        print(f"Permission denied: Unable to read the file at {json_path}")
        exit()
    except FileNotFoundError:
        print(f"File not found: {json_path}")
        exit()
    except json.JSONDecodeError:
        print(f"Error decoding JSON from the file: {json_path}")
        exit()

# Define the directory containing the text file and the JSON file
txt_dir = r"C:\Users\jonas\Desktop\OutputFolder"  # Path to the folder containing the text file
json_file_path = r"C:\Users\jonas\Desktop\JsonGroundTruth\Ornevej-45.json"  # Path to your JSON file

# Get the list of .txt files in the directory
txt_files = [f for f in os.listdir(txt_dir) if f.endswith(".txt")]

# Ensure there is exactly one text file to compare
if len(txt_files) != 1:
    print("Error: There should be exactly one TXT file for comparison.")
    exit()

# Check if the JSON file exists
if not os.path.exists(json_file_path):
    print(f"Error: The JSON file does not exist at the specified path: {json_file_path}")
    exit()

import json
import os

def remove_href(data):
    """ Recursively remove all 'href' keys from JSON data. """
    if isinstance(data, dict):
        return {k: remove_href(v) for k, v in data.items() if k != "href"}
    elif isinstance(data, list):
        return [remove_href(item) for item in data]
    else:
        return data

def load_ground_truth(json_file_path):
    """ Load JSON file and remove all 'href' keys recursively. """
    with open(json_file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    return remove_href(data)

# Example usage
ground_truth = load_ground_truth(json_file_path)

# Read the contents of the text file
txt_file_path = os.path.join(txt_dir, txt_files[0])
with open(txt_file_path, 'r', encoding='utf-8') as f:
    txt_content = f.read()

# Create the prompt for comparison
prompt = (
    f"Your job is to clarify if the Text file content differs from the ground truth data. **DO NOT EXPLAIN THE INSURANCE IM BEGGING YOU**\n\n"
    f"Ground Truth:\n{json.dumps(ground_truth, indent=2)}\n\n"
    f"Text File Content:\n{txt_content}\n\n"
    f"Keep your answer very precise, you should only consider the following variables **()** anything else doesnt matter"
    f"The Text File may not explicitly label the variables, but their values may still be present.\n"
)

url = "http://localhost:11434/api/generate"
data = {
    "model": "phi4",
    "prompt": prompt,
    "stream": False,
    "options": {
        "temperature": 0.7,
        "num_predict": 1000,
        "top_p": 0.9,
        "top_k": 32,
        "repeat_penalty": 1.1,
    }
}

# Function to monitor resource usage in real-time
def monitor_resources(stop_event):
    while not stop_event.is_set():
        cpu_usage = psutil.cpu_percent()
        ram_usage = psutil.virtual_memory().used / (1024 ** 3)  # Convert bytes to GB
        gpus = GPUtil.getGPUs()
        vram_usage = sum(gpu.memoryUsed for gpu in gpus) if gpus else 0
        
        print(f"\n[Resource Monitor] CPU: {cpu_usage:.2f}% | RAM: {ram_usage:.2f} GB | VRAM: {vram_usage:.2f} MB", end="\r")
        time.sleep(1)

# Start resource monitoring in a separate thread
stop_event = threading.Event()
monitor_thread = threading.Thread(target=monitor_resources, args=(stop_event,))
monitor_thread.start()

# Send request to the model
response = requests.post(url, json=data)

# Stop resource monitoring
time.sleep(1)  # Allow final capture before stopping
stop_event.set()
monitor_thread.join()

if response.status_code == 200:
    try:
        result = response.json()
        print("\nResponse:")
        print(result.get("response", ""))  # Extract only the generated text
        print("\nPerformance Metrics:")
        print(f"Total Duration: {result.get('total_duration', 0) / 1e9:.3f} s")
        print(f"Load Duration: {result.get('load_duration', 0) / 1e9:.6f} s")
        print(f"Prompt Eval Count: {result.get('prompt_eval_count', 'N/A')}")
        print(f"Prompt Eval Duration: {result.get('prompt_eval_duration', 0) / 1e9:.6f} s")
        print(f"Eval Count: {result.get('eval_count', 'N/A')}")
        print(f"Eval Duration: {result.get('eval_duration', 0) / 1e9:.3f} s")
    except ValueError:
        print("Error decoding JSON response")
else:
    print(f"Error: {response.status_code}, {response.text}")
