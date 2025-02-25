import json
import re
import spacy
import requests
from sentence_transformers import SentenceTransformer, util

# Load NLP models
def load_nlp_model(language):
    """Dynamically load the appropriate NLP model based on language."""
    if language == "da":
        return spacy.load("da_core_news_lg")
    elif language == "en":
        return spacy.load("en_core_web_lg")
    else:
        raise ValueError("Unsupported language")

def load_sbert_model():
    """Load the SBERT model for similarity comparison."""
    return SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")

def load_json(json_path):
    """Load JSON data from a file, ignoring 'href' fields."""
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    def remove_href(obj):
        if isinstance(obj, dict):
            return {k: remove_href(v) for k, v in obj.items() if k != "href"}
        elif isinstance(obj, list):
            return [remove_href(v) for v in obj]
        return obj
    
    return remove_href(data)

def load_text(text_path):
    """Load text content from a file."""
    with open(text_path, 'r', encoding='utf-8') as f:
        return f.read()

# Cache for generated regex patterns
generated_patterns = {}

def generate_regex_with_llm(field_name, language):
    """Dynamically generate regex for unknown fields using a local LLM."""
    if field_name in generated_patterns:
        return generated_patterns[field_name]  # Use cached regex if available
    
    prompt = f"""
    The field "{field_name}" comes from a structured JSON property data file.
    Generate a regex pattern to extract relevant values from a raw text document written in {language}.
    - Example: "postalCode" → r'\b(\d{4})\b'
    - Example: "areaSize" → r'(\d{2,4})\s?(?:~m²|square meters|sqm|kvadratmeter|kvm|m\?)'
    Return only the regex pattern.
    """
    
    url = "http://localhost:11434/api/generate"
    data = {
        "model": "llama3.2",
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
    
    response = requests.post(url, json=data)
    
    if response.status_code == 200:
        try:
            result = response.json()
            regex = result.get("response", "").strip()
            if regex.startswith("("):
                generated_patterns[field_name] = regex  # Cache the generated regex
                return regex
        except ValueError:
            print("Error decoding JSON response from LLM")
    else:
        print(f"Error: {response.status_code}, {response.text}")
    
    return None  # Ensure valid regex is returned

def extract_value_from_text(text, key, language):
    """Extract relevant information from text using LLM-generated regex."""
    pattern = generate_regex_with_llm(key, language)
    if pattern:
        match = re.search(pattern, text, re.IGNORECASE)
        return match.group(1) if match else None
    return None  # Default if no pattern found

def compare_fields(json_data, text, fields_to_compare, sbert_model, language):
    """Compare specified fields between JSON and extracted text."""
    mismatches = {}
    matches = {}
    
    for field in fields_to_compare:
        json_value = json_data.get(field)
        extracted_value = extract_value_from_text(text, field, language)
        
        if isinstance(json_value, str):  # Text-based comparison
            similarity = util.pytorch_cos_sim(
                sbert_model.encode(json_value, convert_to_tensor=True),
                sbert_model.encode(extracted_value or "", convert_to_tensor=True)
            ).item() if extracted_value else 0
            
            if similarity < 0.85:
                mismatches[field] = {"expected": json_value, "found": extracted_value, "similarity": similarity}
            else:
                matches[field] = {"expected": json_value, "found": extracted_value}
        
        elif isinstance(json_value, (int, float)):  # Numeric comparison
            if extracted_value and json_value != int(extracted_value):
                mismatches[field] = {"expected": json_value, "found": extracted_value}
            else:
                matches[field] = {"expected": json_value, "found": extracted_value}
    
    return matches, mismatches

def main(json_file, text_file, fields_to_compare, language):
    json_data = load_json(json_file)
    extracted_text = load_text(text_file)
    
    nlp = load_nlp_model(language)
    sbert_model = load_sbert_model()
    
    matches, mismatches = compare_fields(json_data, extracted_text, fields_to_compare, sbert_model, language)
    
    print("\nComparison Results:")
    if matches:
        print("Matching Fields:")
        for field, details in matches.items():
            print(f"{field}: Expected and found {details['expected']}")
    
    if mismatches:
        print("\nMismatched Fields:")
        for field, details in mismatches.items():
            print(f"Mismatch in {field}: Expected {details['expected']}, Found {details['found']}")
    else:
        print("\nNo mismatches found.")

# Example usage
json_path = "Files/Ground truth/Ornevej-45.json"
text_path = "Files/Policer/extracted_text.txt"
fields_to_compare = ["address", "areaSize"]
language = "da"  # Define the language dynamically
main(json_path, text_path, fields_to_compare, language)
