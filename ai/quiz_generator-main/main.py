# main.py
import os
import sys
import argparse
import random
from quiz_generator import QuizGenerator
from exporter import QuizExporter, MongoDBExporter


def main():
    parser = argparse.ArgumentParser(description='Generate professional management quizzes from PDF/PPT')
    parser.add_argument('input_file', help='Path to PDF or PPT file')
    parser.add_argument('-o', '--output', default='professional_quiz.txt', 
                       help='Output file (default: professional_quiz.txt)')
    parser.add_argument('-n', '--questions', type=int, default=10,
                       help='Number of questions (default: 10)')
    parser.add_argument('--mongodb', action='store_true',
                       help='Also export the generated quiz to MongoDB')
    parser.add_argument('--mongo-uri', type=str, default=None,
                       help='MongoDB connection URI (or set MONGO_URI env var)')
    parser.add_argument('--mongo-db', type=str, default='management_quizzes',
                       help='MongoDB database name')
    parser.add_argument('--mongo-collection', type=str, default='generated_quizzes',
                       help='MongoDB collection name')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.input_file):
        print(f"Error: File '{args.input_file}' not found.")
        return
    
    print("📊 Professional Management Quiz Generator")
    print("=" * 60)
    
    try:
        # Process document
        print(f"📄 Processing: {args.input_file}")
        generator = QuizGenerator()
        document = generator.process_document(args.input_file)
        
        if not document.concepts:
            print("\n⚠️  Warning: No valid concepts found in document.")
            print("   The document may not contain clear management concepts.")
            print("   Try a different document or check the content.")
            return
        
        # Generate quiz
        print(f"\n❓ Generating {args.questions} questions...")
        questions = generator.generate_quiz(document, args.questions)
        
        if not questions:
            print("❌ Could not generate questions. The document may not contain enough structured content.")
            return
        
        print(f"✅ Generated {len(questions)} professional questions")
        
        # Export to TXT
        exporter = QuizExporter()
        output_path = args.output if args.output.endswith('.txt') else args.output + '.txt'
        exporter.export_to_txt(questions, output_path)
        
        print(f"\n💾 Quiz saved to: {output_path}")
        
        # NEW: MongoDB export (optional)
        if args.mongodb:
            print("\n🗄️  Saving quiz to MongoDB...")
            try:
                metadata = {
                    "source_file": args.input_file,
                    "num_questions_requested": args.questions,
                    "generator": "Professional Management Quiz Generator"
                }
                MongoDBExporter.export_to_mongodb(
                    questions,
                    db_name=args.mongo_db,
                    collection_name=args.mongo_collection,
                    mongo_uri=args.mongo_uri,
                    metadata=metadata
                )
            except Exception as e:
                print(f"⚠️  MongoDB export skipped: {e}")
        
        # Show sample
        if questions:
            print("\n" + "=" * 60)
            print("SAMPLE QUESTION (Formatted):")
            print("=" * 60)
            sample = questions[0]
            print(f"Q: {sample.question}")
            print(f"Type: {sample.question_type}")
            
            if sample.question_type == "multiple_choice":
                print("Options (shuffled):")
                options = sample.options.copy()
                random.shuffle(options)
                for j, opt in enumerate(options[:4], 1):
                    clean_opt = opt[:80] + "..." if len(opt) > 80 else opt
                    print(f"  {chr(64 + j)}. {clean_opt}")
            
            print("=" * 60)
    
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()