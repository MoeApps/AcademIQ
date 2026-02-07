import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, ChevronDown, Calendar, Award, BookOpen, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { fetchCourses, type CourseApi } from "@/lib/api";

interface DashboardHeaderProps {
  username?: string;
}

const DashboardHeader = ({ username = "John Doe" }: DashboardHeaderProps) => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseApi[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchCourses().then((list) => {
      if (!cancelled) setCourses(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = () => {
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link 
          to="/dashboard" 
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <GraduationCap className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold text-foreground">AcademIQ</span>
        </Link>

        <nav className="flex items-center gap-2">
          {/* My Courses Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">My Courses</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover">
              {courses.map((course) => (
                <DropdownMenuItem 
                  key={course.course_id}
                  onClick={() => navigate(`/course/${course.course_id}`)}
                  className="cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{course.course_id}</span>
                    <span className="text-xs text-muted-foreground">{course.course_name ?? course.course_id}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <span className="hidden sm:inline">{username}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-popover">
              <DropdownMenuItem 
                onClick={() => navigate("/schedule")}
                className="cursor-pointer gap-2"
              >
                <Calendar className="h-4 w-4" />
                Schedule
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => navigate("/grades")}
                className="cursor-pointer gap-2"
              >
                <Award className="h-4 w-4" />
                Grades
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer gap-2">
                  <BookOpen className="h-4 w-4" />
                  My Courses
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="bg-popover">
                    {courses.map((course) => (
                      <DropdownMenuItem 
                        key={course.course_id}
                        onClick={() => navigate(`/course/${course.course_id}`)}
                        className="cursor-pointer"
                      >
                        {course.course_id} - {course.course_name ?? course.course_id}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleLogout}
                className="cursor-pointer gap-2 text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  );
};

export default DashboardHeader;
