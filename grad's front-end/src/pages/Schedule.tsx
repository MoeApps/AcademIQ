import DashboardHeader from "@/components/dashboard/DashboardHeader";
import Footer from "@/components/layout/Footer";

const Schedule = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader username="John Doe" />
      
      <main className="container flex-1 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-4">Schedule</h1>
        <p className="text-muted-foreground mb-8">View your class schedule and upcoming events.</p>
        
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">
            Schedule calendar coming soon. This is a placeholder for your class timetable.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Schedule;
