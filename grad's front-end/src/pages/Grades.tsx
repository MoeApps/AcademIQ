import { useState } from "react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import Footer from "@/components/layout/Footer";
import { useUser } from "@/context/UserContext";
import { courses, quizGrades } from "@/data/mockData";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2 } from "lucide-react";

const Grades = () => {
  const { username } = useUser();
  const [selectedCourse, setSelectedCourse] = useState<string>("");

  const grades = selectedCourse ? quizGrades[selectedCourse] || [] : [];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader username={username || "Student"} />

      <main className="container flex-1 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Grades</h1>
          <p className="text-muted-foreground">View your quiz grades for each course.</p>
        </div>

        <div className="mb-6">
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select a course" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.code} — {course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedCourse ? (
          <div className="space-y-4">
            {grades.map((quiz, idx) => {
              const percentage = Math.round((quiz.score / quiz.totalMarks) * 100);
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-5"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-card-foreground">{quiz.quizName}</p>
                      <p className="text-sm text-muted-foreground">{quiz.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      {quiz.score}/{quiz.totalMarks}
                    </p>
                    <p className="text-sm text-muted-foreground">{percentage}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <p className="text-muted-foreground">
              Select a course above to view your quiz grades.
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Grades;
