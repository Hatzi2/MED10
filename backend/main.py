import json
import re
from rapidfuzz import fuzz, process

def load_json(json_path):
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    address = data.get("address", {})
    street_name = str(address.get("streetName", ""))
    house_number = str(address.get("houseNumber", ""))
    postal_code = str(address.get("postalCode", ""))
    postal_district = str(address.get("postalDistrict", ""))
    area_size = str(data.get("areaSize", ""))
    
    return street_name, house_number, postal_code, postal_district, area_size

def load_text(text_path):
    with open(text_path, 'r', encoding='utf-8') as f:
        return f.read()

def find_matches(street_name, house_number, postal_code, postal_district, area_size, text, context_window=1, threshold=80):
    matches = {}
    mismatches = {}
    words = text.split()
    
    # Flags and context storage
    street_name_found = False
    house_number_found = False
    postal_code_found = False
    postal_district_found = False
    area_size_found = False
    
    street_name_flag = False
    house_number_flag = False
    postal_code_flag = False
    postal_district_flag = False

    street_name_contexts = []  # Store all contexts where street name appears
    house_number_contexts = []  # Store all contexts where house number appears
    
    for i in range(len(words)):  # Sweeping window approach
        context_words = words[max(0, i - context_window): min(len(words), i + 1 + context_window)]
        context = " ".join(context_words)
        
        # Check for street name
        if street_name in context:
            street_name_flag = True
            street_name_contexts.append(context)  # Store all occurrences
            if house_number in context:
                street_name_found = True
                matches["streetName"] = street_name
                house_number_found = True
                matches["houseNumber"] = house_number
        
        # **Independent house number check**
        if house_number in context:
            house_number_flag = True
            house_number_contexts.append(context)
            if street_name in context:
                matches["houseNumber"] = house_number
                house_number_found = True

        # Check for postal code and district
        if postal_code in context:
            postal_code_flag = True
            if postal_district in context:
                matches["postalCode"] = postal_code
                postal_code_found = True
        
        if postal_district in context:
            postal_district_flag = True     
            if postal_code in context:
                matches["postalDistrict"] = postal_district
                postal_district_found = True

    # Hvis streetname var fundet men ikke confirmed
    if street_name_flag and not street_name_found:
        mismatches["streetName"] = f"✅ Found street name '{street_name}', but unable to confirm it using house number."

        words_in_context = " ".join(street_name_contexts).split() 
        best_match, score, _ = process.extractOne(house_number, words_in_context, scorer=fuzz.partial_ratio)

        if best_match and score >= threshold:
            mismatches["houseNumber"] = f"❌ Expected '{house_number}', found closest match '{best_match}'."
        else:
            mismatches["houseNumber"] = f"❌ Expected '{house_number}', but no close match found."
    elif not street_name_flag:
        mismatches["streetName"] = f"❌ Expected '{street_name}', but it does not appear in the text."
        

    #Hvis housenumber var fundet men ikke confirmed
    if house_number_flag and not house_number_found:
        mismatches["houseNumber"] = f"✅ Found house number '{house_number}', but unable to confirm it using street name."
        words_in_context = " ".join(house_number_contexts).split() 
        best_match, score, _ = process.extractOne(street_name, words_in_context, scorer=fuzz.partial_ratio)
        if best_match and score >= threshold:
            mismatches["streetName"] = f"❌ Expected '{street_name}', found closest match '{best_match}'."
        else:
            mismatches["streetName"] = f"❌ Expected '{street_name}', but no close match found."
    elif not house_number_flag: #Hvis housenumber slet ikke var fundet
        mismatches["houseNumber"] = f"❌ Expected '{house_number}', but it does not appear in the text."


    if not postal_code_found:
        mismatches["postalCode"] = f"❌ Expected '{postal_code}', but not found in text."
    
    if not postal_district_found:
        mismatches["postalDistrict"] = f"❌ Expected '{postal_district}', but not found in text."
    
    # **Area size matching using regex**
    area_pattern = re.compile(r'(\d{2,4})\s?(?:~mÂ²|square meters|sqm|kvadratmeter|kvm|m\?)', re.IGNORECASE)
    area_matches = area_pattern.findall(text)
    
    # Check for area size
    for area in area_matches:
        if area == area_size:
            matches["areaSize"] = area_size
            area_size_found = True
    
    if not area_size_found:
        mismatches["areaSize"] = f"❌ Expected '{area_size}', but not found in text."
    
    return matches, mismatches

def main(json_path, text_path, context_window=1):
    street_name, house_number, postal_code, postal_district, area_size = load_json(json_path)
    text = load_text(text_path)
    
    matches, mismatches = find_matches(street_name, house_number, postal_code, postal_district, area_size, text, context_window)
    
    print("\nResults:")
    print("----------------------------------")
    print(f"Looking for: Street Name = '{street_name}', House Number = '{house_number}', Postal Code = '{postal_code}', Postal District = '{postal_district}', Area Size = '{area_size}'")
    print("----------------------------------")
    
    if matches:
        print("✔ Matches Found:")
        for field, value in matches.items():
            print(f"  {field}: {value}")
    
    if mismatches:
        print("\n❌ Mismatches:")
        for field, value in mismatches.items():
            print(f"  {field}: {value}")
    else:
        print("\nAll expected values were found!")
    
if __name__ == "__main__":
    json_path = "Files/Ground truth/Ornevej-45.json"
    text_path = "Files/Policer/extracted_text.txt"
    context_window = 2  # Adjust this value to increase/decrease context words
    main(json_path, text_path, context_window)
