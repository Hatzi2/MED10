import json
import re
import spacy
from sentence_transformers import SentenceTransformer, util

def load_json(json_path):
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    address = {k: str(v) for k, v in data.get("address", {}).items() if k not in ["href", "streetCode"]}  # Ignore href and streetCode
    area_size = str(data.get("areaSize", ""))  # Convert int to string for similarity comparison
    
    return address, area_size

def load_text(text_path):
    with open(text_path, 'r', encoding='utf-8') as f:
        return f.read()

# Load NLP model for Named Entity Recognition (NER)
nlp = spacy.load("da_core_news_lg")  # Danish model
sbert_model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")

def extract_entities(text):
    """Extract potential street names, house numbers, postal codes, and districts from the text."""
    street_pattern = re.compile(r'\b[A-ZÆØÅa-zæøå][A-ZÆØÅa-zæøå\s-]+\b')
    house_number_pattern = re.compile(r'\b\d+[A-Za-z]?\b')
    postal_code_pattern = re.compile(r'\b\d{3,4}\b')
    postal_district_pattern = re.compile(r'\b[A-ZÆØÅa-zæøå][A-ZÆØÅa-zæøå\s-]+\b')
    
    streets = set(street_pattern.findall(text))
    house_numbers = set(house_number_pattern.findall(text))
    postal_codes = set(postal_code_pattern.findall(text))
    postal_districts = set(postal_district_pattern.findall(text))
    
    return streets, house_numbers, postal_codes, postal_districts

def compare_address(json_address, text):
    """Find and compare detected address components from text with JSON data."""
    streets, house_numbers, postal_codes, postal_districts = extract_entities(text)
    
    def find_best_match(expected, found_set):
        """Find the best matching element from found_set for the expected value."""
        if expected in found_set:
            return expected, True
        elif found_set:
            return min(found_set, key=lambda x: util.pytorch_cos_sim(
                sbert_model.encode(expected, convert_to_tensor=True),
                sbert_model.encode(x, convert_to_tensor=True)
            ).item(), default=None), False
        return None, False
    
    best_components = {}
    for key, found_set in zip(["streetName", "houseNumber", "postalCode", "postalDistrict"],
                               [streets, house_numbers, postal_codes, postal_districts]):
        best_components[key], is_match = find_best_match(json_address.get(key, ""), found_set)
        best_components[f"{key}_match"] = is_match
    
    return best_components

def main(json_file, text_file):
    json_address, json_area_size = load_json(json_file)
    extracted_text = load_text(text_file)
    best_components = compare_address(json_address, extracted_text)
    
    def print_match(field, expected, found, is_match):
        match_status = "It's a match" if is_match else "It's a mismatch"
        print(f"{field}\nExpected: {expected}. Found: {found}. {match_status}\n")
    
    for key in ["streetName", "houseNumber", "postalCode", "postalDistrict"]:
        print_match(key, json_address.get(key, "N/A"), best_components[key], best_components[f"{key}_match"])

# Example usage
json_path = "Files/Ground truth/Ornevej-45.json"
text_path = "Files/Policer/extracted_text.txt"
main(json_path, text_path)
