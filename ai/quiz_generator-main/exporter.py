# exporter.py
import os
import random
from typing import List, Optional
from data_structures import QuizQuestion


class QuizExporter:
    """Export clean, professional quizzes to .txt"""

    @staticmethod
    def export_to_txt(questions: List[QuizQuestion], output_path: str):
        with open(output_path, 'w', encoding='utf-8') as f:
            # ── Header ──────────────────────────────────────────────────────
            f.write("=" * 70 + "\n")
            f.write("MANAGEMENT KNOWLEDGE ASSESSMENT\n")
            f.write("=" * 70 + "\n\n")
            f.write("Instructions:\n")
            f.write("- Read each question carefully before answering.\n")
            f.write("- For multiple choice questions, select the BEST answer.\n")
            f.write("- For short answer questions, provide 2-3 complete sentences.\n")
            f.write("- Time suggested: 60 minutes for complete assessment.\n")
            f.write("=" * 70 + "\n\n")

            # Keep track of (shuffled_options, correct_letter) for the answer key
            answer_key_data = []

            for i, q in enumerate(questions, 1):
                f.write(f"QUESTION {i}:\n")
                f.write(f"{q.question}\n")
                f.write(f"[{q.question_type.replace('_', ' ').title()} | Difficulty: {q.difficulty:.1f}/1.0]\n\n")

                if q.question_type == "multiple_choice":
                    f.write("Choose the best answer:\n")
                    options = q.options.copy()
                    random.shuffle(options)

                    correct_letter = "A"
                    for j, option in enumerate(options):
                        clean_opt = option.strip()
                        if len(clean_opt) > 100:
                            clean_opt = clean_opt[:97] + "..."
                        letter = chr(65 + j)          # A, B, C, D …
                        if option == q.correct_answer:
                            correct_letter = letter
                        f.write(f"  {letter}. {clean_opt}\n")

                    answer_key_data.append((q, options, correct_letter))
                    f.write("\n")

                else:  # short_answer
                    f.write("Provide a concise answer (2-3 sentences):\n")
                    f.write("_" * 60 + "\n\n\n")
                    answer_key_data.append((q, [], None))

                f.write("-" * 70 + "\n\n")

            # ── Answer key ───────────────────────────────────────────────────
            f.write("\n" + "=" * 70 + "\n")
            f.write("ANSWER KEY AND EXPLANATIONS\n")
            f.write("=" * 70 + "\n\n")

            for i, (q, shuffled_opts, correct_letter) in enumerate(answer_key_data, 1):
                f.write(f"Question {i}: {q.question}\n")
                if q.question_type == "multiple_choice":
                    f.write(f"✓ Correct Answer: {correct_letter}\n")
                    f.write(f"  Explanation: {q.correct_answer}\n")
                else:
                    f.write(f"✓ Sample Answer: {q.correct_answer[:200]}...\n")
                    f.write(f"  Key points should include: {', '.join(q.keywords[:3])}\n")
                f.write("-" * 70 + "\n")

            # ── Summary ──────────────────────────────────────────────────────
            f.write("\n" + "=" * 70 + "\n")
            f.write("ASSESSMENT SUMMARY\n")
            f.write("=" * 70 + "\n")
            mc   = sum(1 for q in questions if q.question_type == "multiple_choice")
            sa   = sum(1 for q in questions if q.question_type == "short_answer")
            easy = sum(1 for q in questions if q.difficulty < 0.5)
            med  = sum(1 for q in questions if 0.5 <= q.difficulty < 0.7)
            hard = sum(1 for q in questions if q.difficulty >= 0.7)
            f.write(f"Total Questions: {len(questions)}\n")
            f.write(f"Multiple Choice Questions: {mc}\n")
            f.write(f"Short Answer Questions: {sa}\n")
            f.write(f"\nDifficulty Breakdown:\n")
            f.write(f"  Easy (<0.5): {easy} questions\n")
            f.write(f"  Medium (0.5-0.7): {med} questions\n")
            f.write(f"  Hard (>0.7): {hard} questions\n")


# ──────────────────────────────────────────────────────────────────────────────
# MongoDB Exporter
# ──────────────────────────────────────────────────────────────────────────────
try:
    from pymongo import MongoClient
    _PYMONGO_AVAILABLE = True
except ImportError:
    MongoClient = None
    _PYMONGO_AVAILABLE = False

from datetime import datetime


class MongoDBExporter:
    """Persist generated quiz questions to MongoDB."""

    @staticmethod
    def export_to_mongodb(
        questions: List[QuizQuestion],
        db_name: str = "management_quizzes",
        collection_name: str = "generated_quizzes",
        mongo_uri: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> Optional[str]:
        """
        Save a quiz to MongoDB.
        Returns the inserted document _id (str) on success, or None on failure.
        """
        if not _PYMONGO_AVAILABLE:
            print("❌  pymongo is not installed.  Run: pip install pymongo")
            return None

        mongo_uri = mongo_uri or os.getenv("MONGO_URI", "mongodb://localhost:27017/")

        try:
            client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5_000)
            client.admin.command("ping")
            collection = client[db_name][collection_name]

            quiz_doc = {
                "created_at": datetime.utcnow(),
                "total_questions": len(questions),
                "multiple_choice_count": sum(
                    1 for q in questions if q.question_type == "multiple_choice"
                ),
                "short_answer_count": sum(
                    1 for q in questions if q.question_type == "short_answer"
                ),
                "average_difficulty": round(
                    sum(q.difficulty for q in questions) / len(questions), 2
                ) if questions else 0.0,
                "questions": [
                    {
                        "question_num": idx + 1,
                        "question":      q.question,
                        "question_type": q.question_type,
                        # Store options in a stable order (sorted so the
                        # API layer can re-shuffle for each student session)
                        "options":        sorted(q.options) if q.options else [],
                        "correct_answer": q.correct_answer,
                        "context":        (q.context or "")[:600],
                        "difficulty":     round(q.difficulty, 2),
                        "keywords":       q.keywords or [],
                    }
                    for idx, q in enumerate(questions)
                ],
                "metadata": metadata or {},
            }

            result  = collection.insert_one(quiz_doc)
            doc_id  = str(result.inserted_id)

            print(f"✅  Quiz saved to MongoDB")
            print(f"   • DB         : {db_name}")
            print(f"   • Collection : {collection_name}")
            print(f"   • Document   : {doc_id}")
            print(f"   • Questions  : {len(questions)}")

            client.close()
            return doc_id

        except Exception as exc:
            print(f"❌  MongoDB export failed: {exc}")
            return None