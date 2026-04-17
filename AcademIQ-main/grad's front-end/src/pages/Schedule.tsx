import DashboardHeader from "@/components/dashboard/DashboardHeader";
import Footer from "@/components/layout/Footer";
import { useUser } from "@/context/UserContext";
import { scheduleData } from "@/data/mockData";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock, MapPin } from "lucide-react";

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];

const Schedule = () => {
  const { username } = useUser();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader username={username || "Student"} />

      <main className="container flex-1 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Schedule</h1>
          <p className="text-muted-foreground">Your weekly class timetable.</p>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[130px]">Day</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Room</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {days.map((day) => {
                const dayEntries = scheduleData.filter((e) => e.day === day);
                return dayEntries.map((entry, idx) => (
                  <TableRow key={`${day}-${idx}`}>
                    {idx === 0 && (
                      <TableCell
                        rowSpan={dayEntries.length}
                        className="font-semibold text-foreground align-top"
                      >
                        {day}
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {entry.time}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium text-foreground">{entry.courseCode}</span>
                        <span className="ml-2 text-sm text-muted-foreground">{entry.courseName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {entry.room}
                      </div>
                    </TableCell>
                  </TableRow>
                ));
              })}
            </TableBody>
          </Table>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Schedule;
