# question_generator.py
import re
import random
from typing import List, Dict, Optional
from nltk.tokenize import sent_tokenize, word_tokenize
from data_structures import QuizQuestion


class IntelligentQuestionGenerator:
    """
    Generate meaningful, test-like questions derived from document content.

    Key improvement over the previous version:
    - Correct answers are extracted from the concept's actual document context
      sentence, not from hardcoded keyword-matched phrases.
    - Distractors are extracted from OTHER concepts' document context sentences,
      so they are in the same topic space (plausible) but describe a different
      concept (incorrect). This makes distractors much harder to dismiss at a glance.
    """

    def __init__(self):
        self.question_templates = {
            'definition': [
                "What is the definition of '{concept}'?",
                "How is '{concept}' defined in the source material?",
                "Which of the following best describes '{concept}'?",
                "What does the term '{concept}' refer to?"
            ],
            'application': [
                "In which real-world scenario would '{concept}' be most applicable?",
                "What is a real-world example of '{concept}' in practice?",
                "When would applying the principles of '{concept}' be most beneficial?",
                "Which situation best demonstrates the use of '{concept}' in practice?"
            ],
            'characteristics': [
                "What is a key characteristic of '{concept}'?",
                "Which feature distinguishes '{concept}' from similar concepts?",
                "What are the main attributes or components of '{concept}'?",
                "Which statement accurately describes a property of '{concept}'?"
            ],
            'comparison': [
                "What is the main difference between '{concept1}' and '{concept2}'?",
                "How does '{concept1}' differ from '{concept2}'?",
                "Which statement correctly contrasts '{concept1}' and '{concept2}'?",
                "What distinguishes the approach of '{concept1}' from '{concept2}'?"
            ],
            'relationship': [
                "How are '{concept1}' and '{concept2}' typically related?",
                "What is the relationship between '{concept1}' and '{concept2}'?",
                "Which statement best describes how '{concept1}' and '{concept2}' interact?",
                "How do '{concept1}' and '{concept2}' interact or complement each other?"
            ]
        }

    # ── Public generators ─────────────────────────────────────────────────────

    def generate_definition_question(
        self, concept_data: Dict, all_concepts: List[Dict] = None
    ) -> Optional[QuizQuestion]:
        """Generate a definition question with document-derived distractors."""
        concept    = concept_data.get('concept', '').strip()
        definition = concept_data.get('definition', '').strip()
        if not concept or not definition:
            return None

        question    = random.choice(self.question_templates['definition']).format(concept=concept)
        distractors = self._definition_distractors(concept, definition, all_concepts or [])
        if len(distractors) < 2:
            return None

        options = distractors[:3] + [definition]
        random.shuffle(options)

        return QuizQuestion(
            question=question,
            options=options,
            correct_answer=definition,
            question_type="multiple_choice",
            context=concept_data.get('context', ''),
            difficulty=0.5,
            keywords=self._keywords(concept)
        )

    def generate_application_question(
        self, concept_data: Dict, all_concepts: List[Dict] = None
    ) -> Optional[QuizQuestion]:
        """
        Generate an application question.
        Correct answer: extracted from the concept's own document sentence.
        Distractors: extracted from other concepts' document sentences.
        """
        concept = concept_data.get('concept', '').strip()
        context = concept_data.get('context', '').strip()
        if not concept or not context:
            return None

        question = random.choice(self.question_templates['application']).format(concept=concept)

        correct = self._best_sentence(context)
        if not correct:
            return None

        distractors = self._cross_concept_distractors(correct, all_concepts or [], exclude=concept)
        if len(distractors) < 2:
            return None

        options = distractors[:3] + [correct]
        random.shuffle(options)

        return QuizQuestion(
            question=question,
            options=options,
            correct_answer=correct,
            question_type="multiple_choice",
            context=context,
            difficulty=0.6,
            keywords=self._keywords(concept)
        )

    def generate_characteristics_question(
        self, concept_data: Dict, all_concepts: List[Dict] = None
    ) -> Optional[QuizQuestion]:
        """
        Generate a characteristics question.
        Correct answer: best sentence from the concept's document context.
        Distractors: sentences from other concepts' document contexts.
        """
        concept = concept_data.get('concept', '').strip()
        context = concept_data.get('context', '').strip()
        if not concept or not context:
            return None

        question = random.choice(self.question_templates['characteristics']).format(concept=concept)

        correct = self._best_sentence(context)
        if not correct:
            return None

        distractors = self._cross_concept_distractors(correct, all_concepts or [], exclude=concept)
        if len(distractors) < 2:
            return None

        options = distractors[:3] + [correct]
        random.shuffle(options)

        return QuizQuestion(
            question=question,
            options=options,
            correct_answer=correct,
            question_type="multiple_choice",
            context=context,
            difficulty=0.55,
            keywords=self._keywords(concept)
        )

    def generate_comparison_question(self, relationship_data: Dict) -> Optional[QuizQuestion]:
        """Generate a comparison question between two related concepts."""
        concept1 = relationship_data.get('concept1', '').strip()
        concept2 = relationship_data.get('concept2', '').strip()
        context  = relationship_data.get('context', '').strip()
        if not concept1 or not concept2:
            return None

        question = random.choice(self.question_templates['comparison']).format(
            concept1=concept1, concept2=concept2
        )
        correct = self._comparison_answer(concept1, concept2, context)

        distractors = [
            f"{concept1} and {concept2} are exactly the same concept with different names",
            f"{concept1} always directly causes or leads to {concept2} in all situations",
            f"{concept2} completely replaces and makes {concept1} entirely obsolete",
            f"{concept1} and {concept2} have absolutely no relationship or connection to each other",
        ]
        options = random.sample(distractors, 3) + [correct]
        random.shuffle(options)

        return QuizQuestion(
            question=question,
            options=options,
            correct_answer=correct,
            question_type="multiple_choice",
            context=context,
            difficulty=0.7,
            keywords=self._keywords(concept1) + self._keywords(concept2)
        )

    def generate_short_answer_question(
        self, paragraph: str, concept: str = ""
    ) -> Optional[QuizQuestion]:
        """Generate a short answer question from a paragraph."""
        sentences = sent_tokenize(paragraph)
        if len(sentences) < 2:
            return None

        main_sentence = max(sentences, key=lambda s: len(s.split()))

        if concept:
            templates = [
                f"Explain the significance of '{concept}' in the context described above.",
                f"Describe a specific situation where understanding '{concept}' would be most valuable.",
                f"What are the key implications of '{concept}' based on the information provided?",
                f"How does '{concept}' relate to the main ideas presented in this passage?"
            ]
        else:
            templates = [
                "Explain the broader significance of the concept described above.",
                "How would you apply this principle in a real-world situation?",
                "What challenges might arise when implementing this approach?",
                "Why is this concept important to understand in this field?"
            ]

        question = random.choice(templates)
        ctx = f"Context: {main_sentence[:150]}..." if len(main_sentence) > 150 else main_sentence

        return QuizQuestion(
            question=question,
            options=[],
            correct_answer=main_sentence,
            question_type="short_answer",
            context=ctx,
            difficulty=0.65,
            keywords=self._keywords(main_sentence[:80])
        )

    # ── Core extraction helpers ───────────────────────────────────────────────

    def _best_sentence(self, context: str, max_words: int = 25) -> str:
        """
        Pick the most informative sentence from a context string and return
        it cleaned up to at most max_words words.
        Prioritises sentences with explanatory verbs (is, involves, refers, etc.)
        and penalises questions and very short fragments.
        """
        sentences = sent_tokenize(context)

        # Filter: must start with a letter, not be a question, be long enough
        candidates = [
            s for s in sentences
            if len(s.split()) >= 7
            and not s.strip().endswith('?')
            and re.match(r'^[a-zA-Z]', s.strip())
        ]
        if not candidates:
            candidates = [s for s in sentences if len(s.split()) >= 5]
        if not candidates:
            return ""

        def _score(s: str) -> int:
            sl = s.lower()
            score = len(s.split())
            for w in ['is', 'are', 'refers', 'means', 'involves', 'defined',
                      'enables', 'allows', 'requires', 'results', 'leads',
                      'causes', 'helps', 'supports', 'focuses', 'provides',
                      'consists', 'includes', 'represents']:
                if f' {w} ' in sl:
                    score += 3
            if s.strip().endswith('?'):
                score -= 20
            return score

        # Prefer sentences that contain at least one predicate verb
        # so slide-title fragments like 'Defining the Environment...' are deprioritised
        _pred_verbs = {
            'is', 'are', 'was', 'were', 'refers', 'means', 'involves', 'defined',
            'enables', 'allows', 'requires', 'results', 'leads', 'causes', 'helps',
            'supports', 'focuses', 'provides', 'consists', 'includes', 'represents',
        }
        with_verbs = [
            c for c in candidates
            if any(f' {v} ' in c.lower() for v in _pred_verbs)
        ]
        pool = with_verbs if with_verbs else candidates
        best = max(pool, key=_score)
        return self._clean(best, max_words)

    def _cross_concept_distractors(
        self, correct: str, all_concepts: List[Dict], exclude: str
    ) -> List[str]:
        """
        Build distractors by extracting the best sentence from OTHER concepts'
        document contexts. These are in the same topic space as the question
        but describe a different concept — so they are plausible but wrong.
        """
        distractors: List[str] = []
        others = [
            c for c in all_concepts
            if c.get('concept', '').lower() != exclude.lower()
            and c.get('context', '').strip()
        ]
        random.shuffle(others)

        for other in others[:15]:
            sentence = self._best_sentence(other['context'])
            if (
                sentence
                and sentence.lower() != correct.lower()
                and sentence not in distractors
                and len(sentence.split()) >= 6
            ):
                distractors.append(sentence)
            if len(distractors) >= 3:
                break

        return distractors

    def _definition_distractors(
        self, concept: str, correct_def: str, all_concepts: List[Dict]
    ) -> List[str]:
        """
        Build definition distractors.
        Primary path: use definitions stored in other concepts (same document).
        Secondary path: derive a sentence from other concepts' contexts.
        Fallback: pattern-based templates (last resort only).
        """
        distractors: List[str] = []

        # Primary — use other concepts' stored definitions
        others_with_defs = [
            c for c in all_concepts
            if c.get('concept', '').lower() != concept.lower()
            and c.get('definition', '').strip()
            and c.get('definition', '').strip().lower() != correct_def.lower()
        ]
        random.shuffle(others_with_defs)
        for other in others_with_defs[:8]:
            defn = other['definition'].strip()
            if defn and defn not in distractors:
                distractors.append(defn)
            if len(distractors) >= 3:
                break

        # Secondary — derive from other concepts' context sentences
        if len(distractors) < 3:
            others_ctx = [
                c for c in all_concepts
                if c.get('concept', '').lower() != concept.lower()
                and not c.get('definition', '').strip()
                and c.get('context', '').strip()
            ]
            random.shuffle(others_ctx)
            for other in others_ctx[:8]:
                sentence = self._best_sentence(other['context'], max_words=20)
                if (
                    sentence
                    and sentence.lower() != correct_def.lower()
                    and sentence not in distractors
                ):
                    distractors.append(sentence)
                if len(distractors) >= 3:
                    break

        # Fallback — pattern templates
        if len(distractors) < 3:
            main = concept.split()[0].lower() if concept.split() else concept.lower()
            templates = [
                f"A method for measuring {main} outcomes in applied settings",
                f"The historical development and origin of {main} as a field",
                f"A specific technique used exclusively in {main} research",
                f"The complete opposite approach to conventional {main} thinking",
                f"A narrow subset of {main} focused only on theoretical aspects",
            ]
            for t in templates:
                if len(distractors) >= 3:
                    break
                if t not in distractors and t.lower() != correct_def.lower():
                    distractors.append(t)

        return distractors[:3]

    def _comparison_answer(self, c1: str, c2: str, context: str) -> str:
        """
        Derive a comparison answer from the relationship context sentence.
        Falls back to hardcoded answers for common concept pairs.
        """
        if context:
            sentence = self._best_sentence(context, max_words=28)
            if sentence and len(sentence.split()) >= 8:
                return f"{c1} and {c2} differ in that {sentence[0].lower()}{sentence[1:]}"

        return (
            f"{c1} typically operates at a broader conceptual level "
            f"while {c2} focuses on more specific or applied aspects"
        )

    # ── Text cleaning ─────────────────────────────────────────────────────────

    def _clean(self, sentence: str, max_words: int = 25) -> str:
        """
        Sanitize a raw sentence for display as an answer option.
        - Strips leading non-alpha characters (bullets, numbers, symbols)
        - Removes non-ASCII
        - Trims to max_words, cutting at a clean word boundary
        - Rejects structural fragments (Figure, Table, etc.)
        """
        sentence = re.sub(r'^[^a-zA-Z]+', '', sentence)
        # Also strip single-letter list markers: 'd. ', 'a) ', '1. ' etc.
        sentence = re.sub(r'^[a-zA-Z][\.\):]\s+', '', sentence)
        sentence = re.sub(r'^\d+[\.\):]\s+', '', sentence)
        sentence = re.sub(r'[^\x00-\x7F]+', ' ', sentence)
        sentence = re.sub(r'[>*~|_=+]{1,3}\s*', '', sentence)
        sentence = sentence.strip().rstrip('.,;:')

        words = sentence.split()
        if len(words) > max_words:
            words = words[:max_words]
            trailing = {
                'a', 'an', 'the', 'of', 'in', 'on', 'at', 'to', 'for',
                'with', 'by', 'and', 'or', 'but', 'as', 'if', 'is',
            }
            while words and words[-1].lower() in trailing:
                words.pop()
            sentence = ' '.join(words)

        if len(sentence.split()) < 5:
            return ""
        if sentence.split()[0].lower() in {
            'figure', 'table', 'exhibit', 'chapter', 'section', 'page', 'note', 'see',
            'prepared', 'source', 'copyright', 'slide',
        }:
            return ""

        return sentence

    # ── Keyword extraction ─────────────────────────────────────────────────────

    def _keywords(self, text: str) -> List[str]:
        stop = {
            'the', 'and', 'for', 'with', 'that', 'this', 'from', 'have',
            'which', 'their', 'about', 'would', 'could', 'been', 'into',
        }
        try:
            words = [w.lower() for w in word_tokenize(text) if w.isalnum() and len(w) > 2]
        except Exception:
            words = [w.lower() for w in text.split() if len(w) > 2]
        return list(dict.fromkeys(w for w in words if w not in stop))[:3]
