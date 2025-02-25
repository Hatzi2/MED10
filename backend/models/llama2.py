import requests
import os
import json

# Create the prompt for comparison
prompt = f"""
The field "{field_name}" comes from a structured JSON property data file.
Generate a regex pattern to extract relevant values from a raw text document.
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




# Send request to the model
response = requests.post(url, json=data)


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