import json
import re

def load_json(json_path):
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    address = {k: str(v) for k, v in data.get("address", {}).items() if k not in ["href", "streetCode"]}  # Ignore href and streetCode
    area_size = str(data.get("areaSize", ""))  # Convert int to string for similarity comparison
    
    return address, area_size

def load_text(text_path):
    with open(text_path, 'r', encoding='utf-8') as f:
        return f.read()

def find_matches(address, area_size, text):
    matches = {}
    mismatches = {}
    for field, value in address.items():
        if value in text:
            matches[field] = value
        else:
            mismatches[field] = value
    if area_size in text:
        matches["areaSize"] = area_size
    else:
        mismatches["areaSize"] = area_size
    return matches, mismatches

def main(json_path, text_path):
    address, area_size = load_json(json_path)
    text = load_text(text_path)
    matches, mismatches = find_matches(address, area_size, text)
    
    if matches:
        for field, value in matches.items():
            print(f"Match found for {field}: {value}")
    if mismatches:
        for field, value in mismatches.items():
            print(f"No match found for {field}: {value}")

if __name__ == "__main__":
    json_path = "Files/Ground truth/Ornevej-45.json"
    text_path = "Files/Policer/extracted_text.txt"
    main(json_path, text_path)