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

def extract_entities(text, json_address):
    """Extract address-related entities using regex, ensuring street name and house number are together."""
    entities_list = []
    
    street_name = json_address.get("streetName", "")
    house_number = json_address.get("houseNumber", "")
    postal_code = json_address.get("postalCode", "")
    postal_district = json_address.get("postalDistrict", "")
    
    # Look for street name + house number combinations with optional floor/side indicators
    address_pattern = fr'({street_name})\s+({house_number}(?:\s*(?:st|th|mf|tv|kl|[1-9])\.?|,?\s*(?:st|th|mf|tv|kl|[1-9])\.?)*?)|({house_number}(?:\s*(?:st|th|mf|tv|kl|[1-9])\.?|,?\s*(?:st|th|mf|tv|kl|[1-9])\.?)*?)\s+({street_name})'
    postal_pattern = fr'({postal_code})\s+({postal_district})|({postal_district})\s+({postal_code})'
    
    address_match = re.search(address_pattern, text, re.IGNORECASE)
    postal_match = re.search(postal_pattern, text, re.IGNORECASE)
    
    if address_match:
        entities_list.append({
            "streetName": street_name,
            "houseNumber": address_match.group(2) or address_match.group(3),
            "postalCode": postal_code if postal_match else None,
            "postalDistrict": postal_district if postal_match else None
        })
    
    return entities_list

def compare_address(json_address, text):
    """Find the most relevant address and compare it to the expected one."""
    extracted_entities_list = extract_entities(text, json_address)
    best_match = extracted_entities_list[0] if extracted_entities_list else None
    
    json_address_str = " ".join(str(v) for v in json_address.values() if v)
    extracted_address_str = " ".join(str(v) for v in best_match.values() if v) if best_match else ""
    
    similarity_score = util.pytorch_cos_sim(
        sbert_model.encode(json_address_str, convert_to_tensor=True),
        sbert_model.encode(extracted_address_str, convert_to_tensor=True)
    ).item() if best_match else 0
    
    return best_match, similarity_score, json_address if similarity_score < 0.85 else None

def compare_area_size(json_area_size, text):
    """Find area size near relevant keywords to avoid misidentification and compute similarity."""
    area_pattern = re.compile(r'(\d{2,4})\s?(?:~m²|square meters|sqm|kvadratmeter|kvm|m\?)', re.IGNORECASE)
    matches = area_pattern.findall(text)
    
    found_match = next((m for m in matches if int(m) == int(json_area_size)), None)
    
    # Compute similarity
    found_match_str = str(found_match) if found_match else ""
    area_similarity = util.pytorch_cos_sim(
        sbert_model.encode(json_area_size, convert_to_tensor=True),
        sbert_model.encode(found_match_str, convert_to_tensor=True)
    ).item() if found_match else 0

    return found_match, area_similarity, json_area_size if area_similarity < 0.85 else None

def main(json_file, text_file):
    json_address, json_area_size = load_json(json_file)
    extracted_text = load_text(text_file)
    
    best_address, address_similarity, address_mismatch = compare_address(json_address, extracted_text)
    found_area_size, area_similarity, area_mismatch = compare_area_size(json_area_size, extracted_text)
    
    print("\nComparison Results:")
    print(f"Expected Address: {json_address}")
    print(f"Best Matched Address: {best_address}")
    print(f"Address Similarity Score: {address_similarity:.2f}")
    
    print(f"Expected Area Size: {json_area_size}")
    print(f"Best Matched Area Size: {found_area_size}")
    print(f"Area Size Similarity Score: {area_similarity:.2f}")
    
    if address_mismatch:
        print(f"Mismatched Address Fields: {address_mismatch}")
    else:
        print(f"Address matches correctly.")

    if area_mismatch:
        print(f"Mismatched Area Size: Expected {area_mismatch}, but not found in document.")
    else:
        print(f"Area size matches correctly.")

# Example usage
json_path = "Files/Ground truth/Ornevej-45.json"
text_path = "Files/Policer/extracted_text.txt"
main(json_path, text_path)
