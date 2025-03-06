import json
import re

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

import re

def find_matches(street_name, house_number, postal_code, postal_district, area_size, text, context_window=1):
    matches = {}
    mismatches = {}
    words = text.split()
    
    street_name_found = False
    house_number_found = False
    postal_code_found = False
    postal_district_found = False
    area_size_found = False
    
    postal_district_flag = False
    postal_code_flag = False
    house_number_flag = False
    street_name_flag = False

    for i in range(len(words)):  # Sweeping window approach
        context_words = words[max(0, i - context_window): i + 1 + context_window]
        context = " ".join(context_words)
        
        #If value we are looking for is in context
        if street_name in context: 
            house_number_flag = True #Set correct value was found
            if house_number in context: #if confirming value was also found
                matches["streetName"] = street_name #Set value found to true.. Det er først her en verdi er bekæftet
                street_name_found = True
        
        if house_number in context:
            house_number_flag = True
            if street_name in context:
                matches["houseNumber"] = house_number
                house_number_found = True
        
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
    
    
    # If something is not found add to mismatches
    if not street_name_found:
        mismatches["streetName"] = street_name
    
    if not house_number_found:
        mismatches["houseNumber"] = house_number
    
    if not postal_code_found:
        mismatches["postalCode"] = postal_code
    
    if not postal_district_found:
        mismatches["postalDistrict"] = postal_district
    
    # Area size matching using regex
    area_pattern = re.compile(r'(\d{2,4})\s?(?:~mÂ²|square meters|sqm|kvadratmeter|kvm|m\?)', re.IGNORECASE)
    area_matches = area_pattern.findall(text)
    
    # Check for area size
    for area in area_matches:
        if area == area_size:
            matches["areaSize"] = area_size
            area_size_found = True
    
    if not area_size_found:
        mismatches["areaSize"] = area_size
    
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
            print(f"  {field}: Expected '{value}', but not found in text")
    else:
        print("\nAll expected values were found!")
    
if __name__ == "__main__":
    json_path = "Files/Ground truth/Ornevej-45.json"
    text_path = "Files/Policer/extracted_text.txt"
    context_window = 2  # Adjust this value to increase/decrease context words
    main(json_path, text_path, context_window)
