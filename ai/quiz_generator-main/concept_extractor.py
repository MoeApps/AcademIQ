# concept_extractor.py
import re
from typing import List, Dict
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer


class ConceptExtractor:
    """Extract meaningful management concepts and definitions from text."""

    def __init__(self):
        try:
            self.stop_words = set(stopwords.words('english'))
        except Exception:
            self.stop_words = {
                'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to',
                'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been'
            }
        self.lemmatizer = WordNetLemmatizer()

        # ── Words that must never start a concept ────────────────────────────
        self.invalid_starters = {
            # Question words
            'tell', 'what', 'how', 'why', 'when', 'where', 'which', 'who',
            # Instruction verbs
            'explain', 'describe', 'define', 'discuss', 'analyze', 'evaluate',
            'compare', 'contrast', 'identify', 'list', 'outline', 'summarize',
            # Document-structure words
            'figure', 'table', 'chapter', 'section', 'page', 'example',
            'exhibit', 'appendix', 'note', 'step',
            # Sentence connectors / fragments
            'if', 'as', 'it', 'its', 'this', 'that', 'these', 'those',
            'when', 'while', 'since', 'because', 'although', 'however',
            'therefore', 'thus', 'hence', 'moreover', 'furthermore',
            'according', 'based', 'given', 'such', 'both', 'each',
            'all', 'any', 'some', 'most', 'many', 'few', 'other', 'another',
            # Common non-concept verbs
            'include', 'includes', 'including', 'involves', 'involving',
            'refer', 'refers', 'provide', 'provides', 'show', 'shows',
            'follow', 'follows', 'suggest', 'suggests', 'indicate', 'indicates',
        }

        # ── Pronouns to reject entirely ───────────────────────────────────────
        self.pronouns = {
            'it', 'he', 'she', 'they', 'we', 'you', 'i', 'me', 'him', 'her',
            'them', 'us', 'this', 'that', 'these', 'those', 'my', 'your',
            'his', 'its', 'our', 'their',
        }

        # ── Words that mark a phrase as a sentence fragment ──────────────────
        self.fragment_enders = {
            'a', 'an', 'the', 'of', 'in', 'on', 'at', 'to', 'for',
            'with', 'by', 'and', 'or', 'but', 'as', 'if', 'is', 'are',
            'was', 'were', 'be', 'been', 'being',
        }

        # ── Seed list of known management concepts (always included) ─────────
        self.known_management_concepts = {
            'strategic management', 'operational management', 'leadership',
            'management', 'decision making', 'change management',
            'risk management', 'project management', 'human resources',
            'organizational behavior', 'business ethics', 'corporate governance',
            'financial management', 'marketing strategy', 'supply chain',
            'quality control', 'performance management', 'team building',
            'conflict resolution', 'stakeholder management',
            'innovation management', 'knowledge management',
            'talent management', 'crisis management',
            'bounded rationality', 'environmental uncertainty',
            'organizational culture', 'management by objectives',
            'technical skills', 'human skills', 'conceptual skills',
            'planning', 'organizing', 'leading', 'controlling',
            'intuitive decision making', 'evidence based management',
            'programmed decision', 'nonprogrammed decision',
            'strategic planning', 'operational planning',
            'omnipotent view', 'symbolic view',
        }

        # ── Regex: person-name patterns to reject ────────────────────────────
        # e.g. "Dr Zeinab Khayal", "Mohamed Zein", "Henri Fayol"
        self._name_pattern = re.compile(
            r'^(?:Dr\.?\s+|Mr\.?\s+|Ms\.?\s+|Prof\.?\s+)?'
            r'[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}$'
        )

        # ── Product / brand name blocklist ────────────────────────────────────
        self._product_blocklist = {
            'lenovo yoga', 'microsoft surface book', 'apple macbook pro',
            'dell xps', 'lenovo thinkpad', 'acer aspire', 'razer blade',
            'acer aspire e', 'razer blade stealth',
            'iphone', 'android', 'windows', 'macos',
        }

    # ─────────────────────────────────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────────────────────────────────

    def clean_text(self, text: str) -> str:
        text = re.sub(r'\bPage\s+\d+\b', '', text)
        text = re.sub(r'\b\d+\s*/\s*\d+\b', '', text)
        text = re.sub(r'^\d+\.?\s*', '', text, flags=re.MULTILINE)
        text = re.sub(r'^[A-Z][A-Z\s]+$', '', text, flags=re.MULTILINE)
        text = re.sub(r'\[.*?\]', '', text)
        text = re.sub(r'\(.*?\)', '', text)
        text = re.sub(
            r'\b(?:For example|For instance|Specifically|In particular|'
            r'That is|i\.e\.|e\.g\.)\b[^.!?]*[.!?]',
            '', text, flags=re.IGNORECASE
        )
        return text

    def extract_real_concepts(self, text: str) -> List[Dict]:
        """Extract meaningful management concepts with their context."""
        concepts: Dict[str, Dict] = {}
        text = self.clean_text(text)
        sentences = sent_tokenize(text)

        # ── Pass 1: explicit "X is Y" / "X refers to Y" definitions ──────────
        for sentence in sentences:
            if len(sentence.split()) < 6:
                continue
            for pattern in [
                r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\s+(?:is|are|was|were)\s+([^,.]{10,}?)(?:\.|,)',
                r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\s+(?:refers to|means|defined as)\s+([^,.]{10,}?)(?:\.|,)',
            ]:
                for concept, definition in re.findall(pattern, sentence):
                    concept = concept.strip()
                    if self._is_valid_concept(concept):
                        key = concept.lower()
                        if key not in concepts or concepts[key]['score'] < 10:
                            concepts[key] = {
                                'concept': concept,
                                'type': 'definition',
                                'context': sentence,
                                'definition': definition.strip(),
                                'score': 10,
                            }

        # ── Pass 2: capitalized multi-word terms appearing ≥ 2 times ─────────
        all_terms = re.findall(
            r'\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){1,3})\b', text
        )
        freq: Dict[str, int] = {}
        for term in all_terms:
            if self._is_valid_concept(term):
                freq[term] = freq.get(term, 0) + 1

        for term, count in freq.items():
            if count >= 2:
                context = next(
                    (s for s in sentences if term in s and len(s.split()) > 5),
                    None
                )
                if context:
                    key = term.lower()
                    score = min(8, count * 2)
                    if key not in concepts or concepts[key]['score'] < score:
                        concepts[key] = {
                            'concept': term,
                            'type': 'term',
                            'context': context,
                            'definition': '',
                            'score': score,
                        }

        # ── Pass 3: seed known management concepts found in text ──────────────
        text_lower = text.lower()
        for known in self.known_management_concepts:
            if known in text_lower:
                context = next(
                    (s for s in sentences
                     if known in s.lower() and len(s.split()) > 5),
                    None
                )
                if context:
                    title = ' '.join(w.capitalize() for w in known.split())
                    key = known
                    if key not in concepts:
                        concepts[key] = {
                            'concept': title,
                            'type': 'known',
                            'context': context,
                            'definition': '',
                            'score': 7,
                        }

        # Sort by score, deduplicate substrings, return top 20
        sorted_concepts = sorted(concepts.values(), key=lambda x: x['score'], reverse=True)
        return self._deduplicate(sorted_concepts)[:20]

    def extract_definitions(self, text: str) -> List[Dict]:
        """Extract concept definitions from text."""
        definitions = []
        sentences = sent_tokenize(text)

        patterns = [
            (r'\b([A-Z][a-zA-Z\s]{3,30})\s+(?:is|are)\s+([^,.!?]{10,80})(?:\.|,|!|\?)', 'is'),
            (r'\b([A-Z][a-zA-Z\s]{3,30})\s+(?:refers to|means)\s+([^,.!?]{10,80})(?:\.|,|!|\?)', 'refers'),
            (r'\b([A-Z][a-zA-Z\s]{3,30})\s+(?:can be defined as|is defined as)\s+([^,.!?]{10,80})(?:\.|,)', 'defined'),
            (r'\b([A-Z][a-zA-Z\s]{3,30})\s+involves\s+([^,.!?]{10,80})(?:\.|,)', 'involves'),
            (r'\b([A-Z][a-zA-Z\s]{3,30})\s+consists of\s+([^,.!?]{10,80})(?:\.|,)', 'consists'),
        ]

        seen = set()
        for sentence in sentences:
            clean = re.sub(r'\[.*?\]|\(.*?\)', '', sentence)
            for pattern, def_type in patterns:
                for concept, definition in re.findall(pattern, clean, re.IGNORECASE):
                    concept = concept.strip()
                    definition = definition.strip().rstrip('.,;:')
                    if (
                        self._is_valid_concept(concept)
                        and 5 <= len(definition.split()) <= 30
                        and concept.lower() not in seen
                    ):
                        seen.add(concept.lower())
                        definitions.append({
                            'concept': concept,
                            'definition': definition,
                            'type': def_type,
                            'sentence': clean,
                            'quality_score': self._rate_definition_quality(definition),
                        })

        definitions.sort(key=lambda x: x['quality_score'], reverse=True)
        return definitions[:20]

    def extract_relationships(self, text: str, concepts: List[Dict]) -> List[Dict]:
        """Extract comparison / association relationships between concepts."""
        relationships = []
        if len(concepts) < 2:
            return relationships

        concept_names = [c['concept'] for c in concepts]
        sentences = sent_tokenize(text)
        comparison_words = [
            'versus', 'vs', 'compared to', 'unlike', 'different from',
            'contrasts with', 'whereas', 'while', 'in contrast to',
        ]

        unique: Dict[tuple, Dict] = {}
        for sentence in sentences:
            present = [n for n in concept_names if n in sentence]
            if len(present) < 2:
                continue
            sl = sentence.lower()
            for word in comparison_words:
                if word in sl:
                    for i in range(len(present) - 1):
                        for j in range(i + 1, len(present)):
                            key = tuple(sorted([present[i], present[j]]) + ['comparison'])
                            if key not in unique:
                                unique[key] = {
                                    'concept1': present[i],
                                    'concept2': present[j],
                                    'relationship': 'comparison',
                                    'context': sentence,
                                    'score': 8,
                                }

        return list(unique.values())[:15]

    # ─────────────────────────────────────────────────────────────────────────
    # Private helpers
    # ─────────────────────────────────────────────────────────────────────────

    def _is_valid_concept(self, term: str) -> bool:
        """Return True only if *term* is a plausible management concept."""
        if not term or not term.strip():
            return False

        term = term.strip()
        term_lower = term.lower()
        words = term.split()

        # ── Length guard ──────────────────────────────────────────────────────
        if len(words) < 2 or len(words) > 5:
            return False

        # ── Pronoun check ─────────────────────────────────────────────────────
        if term_lower in self.pronouns:
            return False

        # ── Invalid starter ───────────────────────────────────────────────────
        first = words[0].lower()
        if first in self.invalid_starters:
            return False

        # ── Fragment ender ────────────────────────────────────────────────────
        last = words[-1].lower()
        if last in self.fragment_enders:
            return False

        # ── Product / brand blocklist ─────────────────────────────────────────
        if term_lower in self._product_blocklist:
            return False

        # ── Person-name pattern: reject names like "Mohamed Zein",
        #    "Dr Zeinab Khayal", "Henri Fayol" etc.
        #    (allow single-word proper nouns that are in known_management_concepts)
        if self._name_pattern.match(term) and term_lower not in self.known_management_concepts:
            # Heuristic: if every word is title-case and none appear in a
            # management vocabulary, it's likely a name
            mgmt_words = {
                'management', 'decision', 'planning', 'organizing', 'leading',
                'controlling', 'leadership', 'strategy', 'strategic', 'operational',
                'culture', 'environment', 'skills', 'roles', 'functions',
                'objectives', 'uncertainty', 'rationality', 'bounded', 'intuitive',
                'programmed', 'structured', 'evidence', 'organizational',
                'behavior', 'ethics', 'governance', 'innovation', 'performance',
                'stakeholder', 'omnipotent', 'symbolic', 'efficiency',
                'effectiveness', 'conceptual', 'technical', 'human',
            }
            if not any(w.lower() in mgmt_words for w in words):
                return False

        # ── Reject common document-structure patterns ─────────────────────────
        bad_patterns = [
            r'^[A-Z]\s*$',
            r'^Figure\s+\d+',
            r'^Table\s+\d+',
            r'^Chapter\s+\d+',
            r'^Section\s+\d+',
            r'^\d+\s*\.',
            r'^.*\?$',
            r'^[A-Z][a-z]+\s+and\s+[A-Z][a-z]+$',
        ]
        for p in bad_patterns:
            if re.match(p, term):
                return False

        # ── All words too short ───────────────────────────────────────────────
        if all(len(w) <= 2 for w in words):
            return False

        return True

    def _rate_definition_quality(self, definition: str) -> int:
        score = 0
        wc = len(definition.split())
        if 5 <= wc <= 20:
            score += 3
        elif wc > 20:
            score += 1
        good = [
            'process', 'method', 'approach', 'technique', 'system',
            'framework', 'model', 'theory', 'concept', 'principle',
            'ability', 'skill', 'function', 'role', 'strategy',
        ]
        for kw in good:
            if kw in definition.lower():
                score += 2
        vague = ['thing', 'stuff', 'something', 'anything', 'everything']
        for v in vague:
            if v in definition.lower():
                score -= 2
        return max(1, score)

    def _deduplicate(self, concepts: List[Dict]) -> List[Dict]:
        """Remove concepts whose name is a substring of a higher-scored one."""
        result = []
        seen_keys = [c['concept'].lower() for c in concepts]
        for i, concept in enumerate(concepts):
            key = concept['concept'].lower()
            is_sub = any(
                key != seen_keys[j] and key in seen_keys[j]
                for j in range(len(seen_keys))
                if j != i
            )
            if not is_sub:
                result.append(concept)
        return result