﻿import re
import json
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
from rapidfuzz import fuzz
import concurrent.futures

# Global configuration for parallel runs:
CONFIGS = [
    (3, 1),   # (chunk_size, overlap)
    (50, 25),
    (100, 50)
]
TOP_K = 20  # number of top candidate chunks to retrieve from FAISS

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
    """
    Splits 'text' into chunks of 'chunk_size' words with an overlap of 'overlap' words.
    For example, with chunk_size=50 and overlap=20:
      - Chunk 1: words 0-49
      - Chunk 2: words 30-79
      - Chunk 3: words 60-109
    This ensures that key phrases spanning chunk boundaries appear in at least one chunk.
    """
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
        i += chunk_size - overlap  # move forward by (chunk_size - overlap) words
    return chunks

def create_faiss_index(chunks, model):
    """
    Encode each chunk and build a FAISS index using L2 distance.
    """
    embeddings = model.encode(chunks, show_progress_bar=False)
    embeddings = np.array(embeddings, dtype='float32')
    dim = embeddings.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(embeddings)
    return index

def search_faiss(query, model, index, chunks, top_k=TOP_K):
    """
    Retrieve top_k chunk matches from FAISS for 'query'.
    Return a list of (chunk_text, distance).
    """
    query_emb = model.encode([query], show_progress_bar=False).astype('float32')
    distances, idxs = index.search(query_emb, top_k)
    results = []
    for dist, chunk_idx in zip(distances[0], idxs[0]):
        results.append((chunks[chunk_idx], dist))
    return results

def find_best_substring_in_chunk(query, chunk):
    """
    Among all possible consecutive sub-phrases of 'chunk' that have
    the same number of tokens as 'query', find the one with the highest fuzzy match using fuzz.ratio.
    """
    chunk_tokens = chunk.split()
    query_tokens = query.split()
    query_len = len(query_tokens)
    
    best_substring = None
    best_score = -1
    
    # Slide a window of length 'query_len' over the tokens in the chunk
    for start_idx in range(len(chunk_tokens) - query_len + 1):
        candidate_tokens = chunk_tokens[start_idx:start_idx + query_len]
        candidate_str = " ".join(candidate_tokens)
        score = fuzz.ratio(query, candidate_str)
        if score > best_score:
            best_score = score
            best_substring = candidate_str
    return best_substring, best_score

def run_search_for_config(config, text, model, queries_to_run):
    """
    For a given configuration (chunk_size, overlap), build overlapping chunks,
    create a FAISS index, and run the search for each query.
    
    Returns:
        config: (chunk_size, overlap)
        config_results: dict mapping query label -> (best_substring, fuzzy_score, faiss_distance, chunk_text)
    """
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

def main():
    # 1) File paths
    json_path = "Files/Ground truth/Ornevej-45.json"
    text_path = "Files/Policer/extracted_text.txt"

    # 2) Load JSON fields
    street_name, house_number, postal_code, postal_district, area_size = load_json(json_path)

    # 3) Read text from file
    with open(text_path, 'r', encoding='utf-8') as f:
        text = f.read()

    # 4) Build combined queries for better context:
    # e.g., "Ørnevej 45" instead of separate "Ørnevej" and "45"
    street_house_query = None
    if street_name and house_number:
        street_house_query = f"{street_name} {house_number}"
    postal_query = None
    if postal_code and postal_district:
        postal_query = f"{postal_code} {postal_district}"
    area_size_query = str(area_size).strip() if area_size else None

    queries_to_run = []
    if street_house_query:
        queries_to_run.append(("street_name+house_number", street_house_query))
    if postal_query:
        queries_to_run.append(("postal_code+postal_district", postal_query))
    if area_size_query:
        queries_to_run.append(("area_size", area_size_query))
    
    # 5) Run searches for each configuration in parallel.
    config_results = {}
    with concurrent.futures.ThreadPoolExecutor() as executor:
        futures = {
            executor.submit(run_search_for_config, config, text, model, queries_to_run): config
            for config in CONFIGS
        }
        for future in concurrent.futures.as_completed(futures):
            config, results = future.result()
            config_results[config] = results

    # 6) For each query label, compare across configurations and select the best match.
    for label, query in queries_to_run:
        best_overall = None
        best_config = None
        for config, res in config_results.items():
            result = res.get(label)
            if result is None:
                continue
            candidate, score, dist, chunk_text = result
            if best_overall is None or score > best_overall[1]:
                best_overall = (candidate, score, dist, chunk_text)
                best_config = config
        if best_overall:
            candidate, score, dist, chunk_text = best_overall
            print(f"\n=== Best result for {label} = '{query}' ===")
            print(f"Using config: chunk_size={best_config[0]}, overlap={best_config[1]}")
            print(f"Best matching substring: '{candidate}'")
            print(f"Fuzzy ratio: {score}/100")
            print(f"FAISS distance: {dist:.4f}")
            print(f"Chunk excerpt:\n{chunk_text[:200]}...\n")
        else:
            print(f"\nNo result for {label} = '{query}'")

if __name__ == "__main__":
    # Load the SentenceTransformer model once and share it.
    model_name = "sentence-transformers/xlm-r-100langs-bert-base-nli-stsb-mean-tokens"
    model = SentenceTransformer(model_name)
    main()
