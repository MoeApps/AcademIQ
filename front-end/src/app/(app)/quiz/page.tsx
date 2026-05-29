"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import type { Course, GeneratedQuiz, LearningMaterial } from "@/lib/types";
import { CourseSelect } from "@/components/common/CourseSelect";
import { MaterialSelect } from "@/components/quiz/MaterialSelect";
import { QuizView } from "@/components/quiz/QuizView";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function QuizPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [materials, setMaterials] = useState<LearningMaterial[] | null>(null);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [quiz, setQuiz] = useState<GeneratedQuiz | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    api.getCourses().then((list) => {
      setCourses(list);
      if (list.length) setSelectedCourse(list[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedCourse) return;
    let active = true;
    api.getMaterials(selectedCourse).then((list) => {
      if (active) setMaterials(list);
    });
    return () => {
      active = false;
    };
  }, [selectedCourse]);

  // Switching course clears the downstream selection + any generated quiz.
  const handleCourseChange = (id: string) => {
    setSelectedCourse(id);
    setMaterials(null);
    setSelectedMaterials([]);
    setQuiz(null);
  };

  const toggleMaterial = (id: string) => {
    setQuiz(null);
    setSelectedMaterials((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const generated = await api.generateQuiz(selectedCourse, selectedMaterials);
      setQuiz(generated);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Quiz Generation</h1>
        <p className="text-muted-foreground">
          Pick a course, choose the materials to revise, and generate a practice quiz.
        </p>
      </div>

      {courses.length ? (
        <CourseSelect
          courses={courses}
          value={selectedCourse}
          onChange={handleCourseChange}
        />
      ) : (
        <Skeleton className="h-16 w-full max-w-sm" />
      )}

      {materials ? (
        <MaterialSelect
          materials={materials}
          selectedIds={selectedMaterials}
          onToggle={toggleMaterial}
        />
      ) : (
        <Skeleton className="h-48 w-full" />
      )}

      <Button
        onClick={handleGenerate}
        disabled={selectedMaterials.length === 0 || isGenerating}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Generate Quiz
          </>
        )}
      </Button>

      {quiz && <QuizView quiz={quiz} />}
    </div>
  );
}
