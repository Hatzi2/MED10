import json
import re
from fuzzywuzzy import fuzz

def load_json(json_path):
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    address = {k: v for k, v in data.get("address", {}).items() if k != "href"}  # Ignore href
    return address, data.get("areaSize", None)

def load_text(text_path):
    with open(text_path, 'r', encoding='utf-8') as f:
        return f.read()

def fuzzy_search(text, target, threshold=80):
    """Search for a target string in text using fuzzy matching."""
    best_match = None
    best_score = 0
    
    for line in text.split('\n'):
        score = fuzz.ratio(line, target)
        if score > best_score:
            best_score = score
            best_match = line
    
    return best_match if best_score >= threshold else None

def extract_house_number(street_match):
    """Extract house number from a street match."""
    if street_match:
        numbers = re.findall(r'\b\d+\b', street_match)
        return numbers[0] if numbers else None
    return None

def extract_postal_code(postal_match):
    """Extract postal code from a postal district match."""
    if postal_match:
        numbers = re.findall(r'\b\d{4}\b', postal_match)
        return numbers[0] if numbers else None
    return None

def compare_address(json_address, text):
    """Compare address components contextually."""
    mismatches = {}
    results = {}
    
    street_match = fuzzy_search(text, json_address.get("streetName", ""))
    house_number = extract_house_number(street_match)
    
    postal_match = fuzzy_search(text, json_address.get("postalDistrict", ""))
    postal_code = extract_postal_code(postal_match)
    
    for key, value in json_address.items():
        if key == "houseNumber":
            match = house_number
        elif key == "postalCode":
            match = postal_code
        else:
            match = fuzzy_search(text, str(value))
        
        results[key] = {"expected": value, "found": match}
        if match is None or str(match) != str(value):
            mismatches[key] = value
    
    return mismatches, results

def compare_area_size(json_area_size, text):
    """Search for area size in text using regex."""
    pattern = re.compile(r'\b(\d{2,4})\b')
    matches = pattern.findall(text)
    found_match = json_area_size if str(json_area_size) in matches else None
    
    return found_match, json_area_size if not found_match else None

def main(json_file, text_file):
    json_address, json_area_size = load_json(json_file)
    extracted_text = load_text(text_file)
    
    address_mismatches, address_results = compare_address(json_address, extracted_text)
    found_area_size, area_mismatch = compare_area_size(json_area_size, extracted_text)
    
    print("\nComparison Results:")
    for key, result in address_results.items():
        print(f"{key}: Expected '{result['expected']}', Found '{result['found']}'")
    
    if address_mismatches:
        print("Mismatched Address Fields:", address_mismatches)
    else:
        print("Address matches correctly.")
    
    if area_mismatch:
        print(f"Mismatched Area Size: Expected {area_mismatch}, but not found in document.")
    else:
        print(f"Area size matches correctly. Expected and found: {found_area_size}")

# Example usage
json_path = "Files/Ground truth/Ornevej-45.json"
text_path = "Files/Policer/extracted_text.txt"
main(json_path, text_path)
