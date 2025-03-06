import json
import re
import requests

url = "http://localhost:11434/api/generate"
data = {
    "model": "llama3.2",
    "stream": False,
    "options": {
        "temperature": 0.7,
        "num_predict": 1000,
        "top_p": 0.9,
        "top_k": 32,
        "repeat_penalty": 1.1,
    }
}

def load_json(json_path):
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Extract variables from JSON (street name, house number, area size, etc.)
    address = data.get("address", {})
    street_name = str(address.get("streetName", ""))
    house_number = str(address.get("houseNumber", ""))
    area_size = str(data.get("areaSize", ""))
    
    return street_name, house_number, area_size

def load_text(text_path):
    with open(text_path, 'r', encoding='utf-8') as f:
        return f.read()

def find_matches(street_name, house_number, area_size, text):
    matches = {}
    mismatches = {}
    detected_addresses = []
    
    # Check if street name is in the text
    if street_name in text:
        matches["streetName"] = street_name
    else:
        mismatches["streetName"] = street_name
    
    # Check if area size is in the text
    if area_size and area_size in text:
        matches["areaSize"] = area_size
    else:
        mismatches["areaSize"] = area_size
    
    # Search for house number in the text
    matches_in_text = re.finditer(r'(\w+)\s+(\d+)\s+(\w+)', text)
    
    for match in matches_in_text:
        before_word = match.group(1)
        house_number_in_text = match.group(2)
        after_word = match.group(3)
        
        # Only proceed if the found house number matches the expected one from the JSON
        if house_number_in_text == house_number:
            context = f"{before_word} {house_number_in_text} {after_word}"
            # Ask the LLM if this context is an address
            llm_response = query_llm(context, street_name, house_number)
            
            # Only add as a match if the LLM confirms it as an address
            if llm_response == "true":
                detected_addresses.append(context)
    
    return matches, mismatches, detected_addresses

def query_llm(context, street_name, house_number):
    # Send the context to the LLM for verification
    data["prompt"] = (
        f"Answer 'true' if the following words/numbers is included in the context: {street_name} {house_number}  Context: {context}. Else say 'false'"
    )
    response = requests.post(url, json=data)
    
    if response.status_code == 200:
        response_json = response.json()
        result = response_json.get("response", "").strip().lower()

        if result == "true" or result == "true.": #DET ER HER MAN KAN SE OM CHATBOTTEN SVARE SANDT ELLER FALSK
            return "true"
        elif result == "false":
            return "false"
    
    return "false"  # Default to false if LLM response is not valid

def main(json_path, text_path):
    # Load variables from JSON and text from file
    street_name, house_number, area_size = load_json(json_path)
    text = load_text(text_path)
    
    # Find matches in the text based on the house number and other variables
    matches, mismatches, detected_addresses = find_matches(street_name, house_number, area_size, text)
    
    # Display matches
    print("Matches:")
    for field, value in matches.items():
        print(f"{field}: {value}")
    
    # Display mismatches
    if mismatches:
        print("\nMismatches:")
        for field, value in mismatches.items():
            print(f"{field}: {value}")
    
    # Display detected addresses
    if detected_addresses:
        print("\nDetected addresses:")
        for addr in detected_addresses:
            print(f"  {addr}")
    else:
        print("No valid addresses found.")

if __name__ == "__main__":
    json_path = "Files/Ground truth/Ornevej-45.json"  # Path to your JSON file
    text_path = "Files/Policer/extracted_text.txt"    # Path to your extracted text file
    main(json_path, text_path)
