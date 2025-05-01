import re
import json
import numpy as np
import string
import faiss
from sentence_transformers import SentenceTransformer
from rapidfuzz import fuzz
import concurrent.futures
import os
import glob
from models import tesseractocr
from pathlib import Path
from tqdm import tqdm

CONFIGS = [
    (3, 1),   # (chunk_size, overlap)
    (50, 25),
    (100, 50)
]
TOP_K = 20

def load_json(json_path):
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    address = data.get("address", {})
    return (
        address.get("streetName", ""),
        address.get("houseNumber", ""),
        address.get("postalCode", ""),
        address.get("postalDistrict", ""),
        data.get("areaSize", "")
    )

def chunk_text_with_overlap(text, chunk_size, overlap):
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
        i += chunk_size - overlap
    return chunks

def create_faiss_index(chunks, model):
    embeddings = model.encode(chunks, show_progress_bar=False)
    embeddings = np.array(embeddings, dtype='float32')
    dim = embeddings.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(embeddings)
    return index

def search_faiss(query, model, index, chunks, top_k=TOP_K):
    query_emb = model.encode([query], show_progress_bar=False).astype('float32')
    distances, idxs = index.search(query_emb, top_k)
    results = []
    for dist, chunk_idx in zip(distances[0], idxs[0]):
        results.append((chunks[chunk_idx], dist))
    return results

def remove_punctuation(text):
    translator = str.maketrans('', '', string.punctuation)
    return text.translate(translator)

def find_best_substring_in_chunk(query, chunk):
    query_clean = remove_punctuation(query)
    query_tokens = query_clean.split()
    query_len = len(query_tokens)
    best_substring = None
    best_score = -1
    chunk_tokens = chunk.split()
    for start_idx in range(len(chunk_tokens) - query_len + 1):
        candidate_tokens = chunk_tokens[start_idx:start_idx + query_len]
        candidate_str = " ".join(candidate_tokens)
        candidate_clean = remove_punctuation(candidate_str)
        score = fuzz.ratio(query_clean, candidate_clean)
        if score > best_score:
            best_score = score
            best_substring = candidate_str
    return best_substring, best_score

def run_search_for_config(config, text, model, queries_to_run):
    chunk_size, overlap = config
    chunks = chunk_text_with_overlap(text, chunk_size, overlap)
    index = create_faiss_index(chunks, model)
    config_results = {}
    for label, query in queries_to_run:
        candidates = search_faiss(query, model, index, chunks, top_k=TOP_K)
        best_fuzzy_score = -1
        best_candidate = None
        best_distance = None
        best_chunk = None
        for chunk_text, dist in candidates:
            substring, score = find_best_substring_in_chunk(query, chunk_text)
            if score > best_fuzzy_score:
                best_fuzzy_score = score
                best_candidate = substring
                best_distance = dist
                best_chunk = chunk_text
        config_results[label] = (best_candidate, best_fuzzy_score, best_distance, best_chunk)
    return config, config_results

def update_progress_json(progress_dir, pbar, status=""):
    progress_value = round(pbar.n / pbar.total, 4)
    progress_path = os.path.join(progress_dir, "progress.json")

    # Load current OCR progress to preserve it
    ocr_data = {"progress": 1.0, "status": "Scanning færdig"}  # Default fallback
    if os.path.exists(progress_path):
        try:
            with open(progress_path, "r", encoding="utf-8") as f:
                existing = json.load(f)
                ocr_data = existing.get("ocr", ocr_data)
        except Exception as e:
            print("⚠️ Failed to load existing OCR progress:", e)

    with open(progress_path, "w", encoding="utf-8") as f:
        json.dump({
            "ocr": ocr_data,
            "main": {
                "progress": progress_value,
                "status": status
            }
        }, f, ensure_ascii=False)

def sanitize_matched_substring(text):
    """
    Remove commas and periods from the text.
    Replace any occurrence of "m?" with "m²".
    """
    if not text:
        return text
    # Remove commas and periods
    sanitized = text.replace(",", "").replace(".", "")
    # Replace "m?2" with "m²" first
    sanitized = sanitized.replace("m?2", "m2")
    # Replace "m?" with "m²"
    sanitized = sanitized.replace("m?", "m2")
    return sanitized

def main():
    json_dir = "Files/Ground-truth"
    text_dir = "Files/Policer"
    output_dir = "Files/Output"
    progressBar_dir = "Files/ProgressBar"

    os.makedirs(progressBar_dir, exist_ok=True)
    final_progress_path = os.path.join(progressBar_dir, "progress.json")
    with open(final_progress_path, "w", encoding="utf-8") as f:
        json.dump({
            "ocr": {"progress": 1.0, "status": "Scanning færdig"},
            "main": {"progress": 0.0, "status": "Starting..."}
        }, f, ensure_ascii=False)

    os.makedirs(output_dir, exist_ok=True)
    json_files = glob.glob(os.path.join(json_dir, "*.json"))

    for json_path in json_files:
        filename = os.path.splitext(os.path.basename(json_path))[0]
        text_path = os.path.join(text_dir, f"{filename}.txt")
        output_path = os.path.join(output_dir, f"{filename}.json")

        with tqdm(total=8, desc=f"Processing {filename}", ncols=100, dynamic_ncols=True) as pbar:
            def update_progress(status=""):
                update_progress_json(progressBar_dir, pbar, status)

            if os.path.exists(output_path):
                pbar.write(f"Output already exists for '{filename}', skipping.")
                pbar.update(8)
                update_progress("Completed (skipped)")
                continue

            pbar.set_description("Step 1: Loading JSON")
            street_name, house_number, postal_code, postal_district, area_size = load_json(json_path)
            pbar.update(1)
            update_progress("Loader Værdier")

            pbar.set_description("Step 2: Reading Text")
            with open(text_path, 'r', encoding='utf-8') as f:
                text = f.read()
            pbar.update(1)
            update_progress("Læser Tekst")

            pbar.set_description("Step 3: Building Search Queries")
            queries_to_run = []
            group_mapping = {}
            if street_name and house_number:
                label = "street_name+house_number"
                query = f"{street_name} {house_number}"
                queries_to_run.append((label, query))
                group_mapping[label] = label

            if postal_code and postal_district:
                label = "postal_code+postal_district"
                query = f"{postal_code} {postal_district}"
                queries_to_run.append((label, query))
                group_mapping[label] = label

            if area_size:
                area_size_str = str(area_size).strip()
                for unit in ["m2", "m?", "kvm"]:
                    # When the unit follows the number
                    label_suffix = f"area_size_{unit}_suffix"
                    query_suffix = f"{area_size_str} {unit}"
                    queries_to_run.append((label_suffix, query_suffix))
                    group_mapping[label_suffix] = "area_size"

                    # When the unit precedes the number
                    label_prefix = f"area_size_{unit}_prefix"
                    query_prefix = f"{unit} {area_size_str}"
                    queries_to_run.append((label_prefix, query_prefix))
                    group_mapping[label_prefix] = "area_size"

            pbar.update(1)
            update_progress("Klargør søgning")

            pbar.set_description("Step 4-6: Running FAISS configs")
            config_results = {}
            with concurrent.futures.ThreadPoolExecutor() as executor:
                futures = {
                    executor.submit(run_search_for_config, config, text, model, queries_to_run): config
                    for config in CONFIGS
                }
                for future in concurrent.futures.as_completed(futures):
                    config, results = future.result()
                    config_results[config] = results
                    pbar.write(f"  → Finished config: chunk_size={config[0]}, overlap={config[1]}")
                    pbar.update(1)
                    update_progress("Søger igennem Dokumentet")

            pbar.set_description("Step 7: Saving data")
            group_to_labels = {}
            for label, group in group_mapping.items():
                group_to_labels.setdefault(group, []).append(label)

            addresses, postal_codes, area_sizes_results = [], [], []
            group_index = 0

            for group, labels in group_to_labels.items():
                best_overall = None
                best_config = None
                best_query = None
                for config, res in config_results.items():
                    for label in labels:
                        result = res.get(label)
                        if result is None:
                            continue
                        candidate, score, dist, chunk_text = result
                        if best_overall is None or score > best_overall[1]:
                            best_overall = (candidate, score, dist, chunk_text)
                            best_config = config
                            best_query = next(q for lab, q in queries_to_run if lab == label)
                if best_overall:
                    candidate, score, dist, chunk_text = best_overall
                    # Sanitize the best candidate before saving it
                    candidate = sanitize_matched_substring(candidate)
                    result_data = {
                        "group": group,
                        "query": best_query,
                        "chunk_size": best_config[0],
                        "overlap": best_config[1],
                        "matched_substring": candidate,
                        "fuzzy_score": score,
                        "faiss_distance": dist,
                        "chunk_excerpt": chunk_text[:200]
                    }
                    if group_index == 0:
                        addresses.append(result_data)
                    elif group_index == 1:
                        postal_codes.append(result_data)
                    elif group_index == 2:
                        area_sizes_results.append(result_data)
                group_index += 1

            output_data = [
                {
                    "id": "Adresse:",
                    "expected": f"{street_name} {house_number}",
                    "received": addresses[0]["matched_substring"] if addresses else "",
                    "confidence": f'{addresses[0]["fuzzy_score"]}%' if addresses else ""
                },
                {
                    "id": "Areal:",
                    "expected": str(area_size),
                    "received": area_sizes_results[0]["matched_substring"] if area_sizes_results else "",
                    "confidence": f'{area_sizes_results[0]["fuzzy_score"]}%' if area_sizes_results else ""
                },
                {
                    "id": "By:",
                    "expected": f"{postal_district} {postal_code}",
                    "received": postal_codes[0]["matched_substring"] if postal_codes else "",
                    "confidence": f'{postal_codes[0]["fuzzy_score"]}%' if postal_codes else ""
                }
            ]

            with open(output_path, "w", encoding="utf-8") as outfile:
                json.dump(output_data, outfile, ensure_ascii=False, indent=4)
            pbar.update(1)
            update_progress("Gennemført")

            # ✅ Force final progress to 100% for main
            with open(os.path.join(progressBar_dir, "progress.json"), "r", encoding="utf-8") as f:
                final_data = json.load(f)
            final_data["main"] = {"progress": 1.0, "status": "Færdig"}
            with open(os.path.join(progressBar_dir, "progress.json"), "w", encoding="utf-8") as f:
                json.dump(final_data, f, ensure_ascii=False)

if __name__ == "__main__":
    model_name = "sentence-transformers/xlm-r-100langs-bert-base-nli-stsb-mean-tokens"
    model = SentenceTransformer(model_name)
    tesseractocr.process_all_pdfs()
    main()
