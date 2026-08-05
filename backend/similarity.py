"""
Similarity and Meaning Preservation Engine using RapidFuzz and SentenceTransformers.
Computes structural edit distance, fuzzy ratio, and semantic meaning preservation scores.
"""

import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# RapidFuzz initialization
try:
    from rapidfuzz import fuzz, distance
    HAS_RAPIDFUZZ = True
except ImportError:
    HAS_RAPIDFUZZ = False
    logger.warning("RapidFuzz not installed. Falling back to basic string comparison.")

# SentenceTransformers initialization
_st_model = None
HAS_SENTENCE_TRANSFORMERS = False

def _load_sentence_transformers():
    global _st_model, HAS_SENTENCE_TRANSFORMERS
    if _st_model is not None:
        return _st_model
    try:
        from sentence_transformers import SentenceTransformer
        try:
            _st_model = SentenceTransformer("all-MiniLM-L6-v2", local_files_only=True)
        except Exception:
            _st_model = SentenceTransformer("all-MiniLM-L6-v2")
        HAS_SENTENCE_TRANSFORMERS = True
        return _st_model
    except Exception as e:
        logger.info("SentenceTransformers model unavailable: %s", e)
        HAS_SENTENCE_TRANSFORMERS = False
        return None


def calculate_similarity_metrics(original_text: str, rewritten_text: str) -> Dict[str, Any]:
    """
    Calculate semantic similarity, fuzzy ratio, and meaning preservation scores.
    """
    if not original_text or not rewritten_text:
        return {
            "fuzzy_similarity": 0.0,
            "token_set_ratio": 0.0,
            "semantic_similarity": 0.0,
            "meaning_preservation_score": 0.0,
            "is_duplicate": False
        }

    # 1. RapidFuzz structural fuzzy metrics
    if HAS_RAPIDFUZZ:
        fuzzy_ratio = round(fuzz.ratio(original_text, rewritten_text), 2)
        token_set = round(fuzz.token_set_ratio(original_text, rewritten_text), 2)
        token_sort = round(fuzz.token_sort_ratio(original_text, rewritten_text), 2)
    else:
        fuzzy_ratio = 50.0
        token_set = 50.0
        token_sort = 50.0

    # Check duplicate (if text was untouched / 100% identical)
    is_duplicate = fuzzy_ratio >= 98.0 and original_text.strip() == rewritten_text.strip()

    # 2. SentenceTransformers semantic similarity
    st_model = _load_sentence_transformers()
    semantic_sim = 0.0
    if st_model is not None:
        try:
            embeddings = st_model.encode([original_text, rewritten_text])
            from sentence_transformers import util
            cosine_score = util.cos_sim(embeddings[0], embeddings[1]).item()
            semantic_sim = round(max(0.0, min(1.0, cosine_score)) * 100, 2)
        except Exception as err:
            logger.warning("Error calculating sentence embeddings: %s", err)
            semantic_sim = token_set
    else:
        # High token overlap fallback estimation
        semantic_sim = round((token_set * 0.7) + (token_sort * 0.3), 2)

    # 3. Overall Meaning Preservation Score (0-100%)
    meaning_preservation_score = round((semantic_sim * 0.6) + (token_set * 0.4), 1)

    return {
        "fuzzy_similarity": fuzzy_ratio,
        "token_set_ratio": token_set,
        "semantic_similarity": semantic_sim,
        "meaning_preservation_score": min(100.0, max(0.0, meaning_preservation_score)),
        "is_duplicate": is_duplicate
    }
