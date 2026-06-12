# exporter.py
import os
import random
from typing import List, Optional
from data_structures import QuizQuestion

class QuizExporter:
    """Export clean, professional quizzes"""
    
    @staticmethod
    def export_to_txt(questions: List[QuizQuestion], output_path: str):
        """Export quiz to text file"""
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write("=" * 70 + "\n")
            f.write("MANAGEMENT KNOWLEDGE ASSESSMENT\n")
            f.write("=" * 70 + "\n\n")
            
            f.write("Instructions:\n")
            f.write("- Read each question carefully before answering.\n")
            f.write("- For multiple choice questions, select the BEST answer.\n")
            f.write("- For short answer questions, provide 2-3 complete sentences.\n")
            f.write("- Time suggested: 60 minutes for complete assessment.\n")
            f.write("=" * 70 + "\n\n")
            
            for i, q in enumerate(questions, 1):
                f.write(f"QUESTION {i}:\n")
                f.write(f"{q.question}\n")
                f.write(f"[{q.question_type.replace('_', ' ').title()} | Difficulty: {q.difficulty:.1f}/1.0]\n\n")
                
                if q.question_type == "multiple_choice":
                    f.write("Choose the best answer:\n")
                    # Shuffle options for fairness
                    options = q.options.copy()
                    random.shuffle(options)
                    
                    for j, option in enumerate(options, 1):
                        # Clean and truncate option
                        clean_opt = option.strip()
                        if clean_opt.endswith('...'):
                            clean_opt = clean_opt[:-3]
                        if len(clean_opt) > 100:
                            clean_opt = clean_opt[:97] + "..."
                        
                        f.write(f"  {chr(64 + j)}. {clean_opt}\n")
                    
                    f.write("\n")
                
                elif q.question_type == "short_answer":
                    f.write("Provide a concise answer (2-3 sentences):\n")
                    f.write("_" * 60 + "\n")
                    f.write("\n" * 3)
                
                f.write("-" * 70 + "\n\n")
            
            # Answer key (separate section)
            f.write("\n" + "=" * 70 + "\n")
            f.write("ANSWER KEY AND EXPLANATIONS\n")
            f.write("=" * 70 + "\n\n")
            
            for i, q in enumerate(questions, 1):
                f.write(f"Question {i}: {q.question}\n")
                
                if q.question_type == "multiple_choice":
                    # Find correct option letter
                    for j, option in enumerate(q.options, 1):
                        if option == q.correct_answer:
                            f.write(f"✓ Correct Answer: {chr(64 + j)}\n")
                            break
                    f.write(f"  Explanation: {q.correct_answer}\n")
                else:
                    f.write(f"✓ Sample Answer: {q.correct_answer[:200]}...\n")
                    f.write(f"  Key points should include: {', '.join(q.keywords[:3])}\n")
                
                f.write("-" * 70 + "\n")
            
            # Statistics
            f.write("\n" + "=" * 70 + "\n")
            f.write("ASSESSMENT SUMMARY\n")
            f.write("=" * 70 + "\n")
            f.write(f"Total Questions: {len(questions)}\n")
            mc_count = sum(1 for q in questions if q.question_type == "multiple_choice")
            sa_count = sum(1 for q in questions if q.question_type == "short_answer")
            f.write(f"Multiple Choice Questions: {mc_count}\n")
            f.write(f"Short Answer Questions: {sa_count}\n")
            
            # Difficulty distribution
            easy = sum(1 for q in questions if q.difficulty < 0.5)
            medium = sum(1 for q in questions if 0.5 <= q.difficulty < 0.7)
            hard = sum(1 for q in questions if q.difficulty >= 0.7)
            f.write(f"\nDifficulty Breakdown:\n")
            f.write(f"  Easy (<0.5): {easy} questions\n")
            f.write(f"  Medium (0.5-0.7): {medium} questions\n")
            f.write(f"  Hard (>0.7): {hard} questions\n")


# =============================================================================
# NEW: MongoDB Exporter
# =============================================================================

try:
    from pymongo import MongoClient
except ImportError:
    MongoClient = None

from datetime import datetime


class MongoDBExporter:
    """Export structured quiz questions to MongoDB for persistence, search, and analytics"""
    
    @staticmethod
    def export_to_mongodb(
        questions: List[QuizQuestion],
        db_name: str = "management_quizzes",
        collection_name: str = "generated_quizzes",
        mongo_uri: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> Optional[str]:
        """
        Save the generated quiz to MongoDB.
        Returns the inserted document _id (as string) on success, None on failure.
        """
        if MongoClient is None:
            print("❌ pymongo is not installed.")
            print("   → Run: pip install pymongo")
            print("   → Or re-run: python setup.py")
            return None

        if mongo_uri is None:
            mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/")

        try:
            client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
            client.admin.command('ping')

            db = client[db_name]
            collection = db[collection_name]

            quiz_doc = {
                "created_at": datetime.utcnow(),
                "total_questions": len(questions),
                "multiple_choice_count": sum(1 for q in questions if q.question_type == "multiple_choice"),
                "short_answer_count": sum(1 for q in questions if q.question_type == "short_answer"),
                "average_difficulty": round(
                    sum(q.difficulty for q in questions) / len(questions), 2
                ) if questions else 0.0,
                "questions": [
                    {
                        "question_num": idx + 1,
                        "question": q.question,
                        "question_type": q.question_type,
                        "options": q.options if q.question_type == "multiple_choice" else [],
                        "correct_answer": q.correct_answer,
                        "context": (q.context or "")[:600],
                        "difficulty": round(q.difficulty, 2),
                        "keywords": q.keywords or []
                    }
                    for idx, q in enumerate(questions)
                ],
                "metadata": metadata or {}
            }

            result = collection.insert_one(quiz_doc)
            doc_id = str(result.inserted_id)

            print(f"✅ Successfully saved quiz to MongoDB")
            print(f"   • Database   : {db_name}")
            print(f"   • Collection : {collection_name}")
            print(f"   • Document ID: {doc_id}")
            print(f"   • Questions  : {len(questions)}")

            client.close()
            return doc_id

        except Exception as e:
            print(f"❌ MongoDB export failed: {e}")
            print("   Common fixes:")
            print("   - Start MongoDB locally or use MongoDB Atlas")
            print("   - Set MONGO_URI environment variable")
            print("   - For Atlas use: mongodb+srv://user:password@cluster...")
            return None