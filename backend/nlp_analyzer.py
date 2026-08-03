"""
NLP Analysis Engine powered by spaCy.
Extracts POS distributions, active/passive voice balance, named entity counts, and clause structures.
"""

import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

_nlp_model = None
HAS_SPACY = False

def _get_spacy_nlp():
    global _nlp_model, HAS_SPACY
    if _nlp_model is not None:
        return _nlp_model
    try:
        import spacy
        try:
            _nlp_model = spacy.load("en_core_web_sm")
        except OSError:
            # Auto-download lightweight model if not yet downloaded
            spacy.cli.download("en_core_web_sm")
            _nlp_model = spacy.load("en_core_web_sm")
        HAS_SPACY = True
        return _nlp_model
    except Exception as e:
        logger.info("spaCy NLP engine unavailable (%s). Using fallback parser.", e)
        HAS_SPACY = False
        return None


def analyze_text_nlp(text: str) -> Dict[str, Any]:
    """
    Perform deep spaCy NLP analysis on text.
    """
    if not text or not text.strip():
        return {
            "pos_distribution": {},
            "passive_voice_count": 0,
            "active_voice_count": 0,
            "entities": [],
            "avg_dependency_depth": 0.0,
            "has_spacy": False
        }

    nlp = _get_spacy_nlp()
    if nlp is None:
        # Basic heuristic fallback
        words = text.split()
        return {
            "pos_distribution": {"NOUN": len(words) // 3, "VERB": len(words) // 4, "ADJ": len(words) // 6},
            "passive_voice_count": 0,
            "active_voice_count": max(1, text.count('.') + text.count('!')),
            "entities": [],
            "avg_dependency_depth": 3.0,
            "has_spacy": False
        }

    doc = nlp(text)

    # 1. POS Tag Counts
    pos_counts: Dict[str, int] = {}
    for token in doc:
        pos_counts[token.pos_] = pos_counts.get(token.pos_, 0) + 1

    # 2. Passive vs Active Voice Detection via Dependency Tree
    passive_count = 0
    active_count = 0
    for sent in doc.sents:
        is_passive = any(tok.dep_ in ("auxpass", "agent") for tok in sent)
        if is_passive:
            passive_count += 1
        else:
            active_count += 1

    # 3. Named Entities
    entities: List[Dict[str, str]] = [
        {"text": ent.text, "label": ent.label_}
        for ent in doc.ents[:10]  # Cap top 10 entities
    ]

    # 4. Average Dependency Tree Depth
    depths = [len(list(token.ancestors)) for token in doc]
    avg_depth = round(sum(depths) / max(1, len(depths)), 2)

    return {
        "pos_distribution": pos_counts,
        "passive_voice_count": passive_count,
        "active_voice_count": active_count,
        "entities": entities,
        "avg_dependency_depth": avg_depth,
        "has_spacy": True
    }
