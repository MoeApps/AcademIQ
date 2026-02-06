import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import { BookMarked, TrendingUp, AlertTriangle, Users } from "lucide-react";

const Index = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        
        {/* Features Section */}
        <section className="py-20">
          <div className="container">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
                Why Choose AcademIQ?
              </h2>
              <p className="mx-auto max-w-2xl text-muted-foreground">
                Our platform provides powerful tools to help students and educators track academic progress and identify areas for improvement.
              </p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <BookMarked className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 font-semibold text-card-foreground">Course Overview</h3>
                <p className="text-sm text-muted-foreground">
                  Access all your enrolled courses and track completion status in one unified dashboard.
                </p>
              </div>
              
              <div className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 font-semibold text-card-foreground">Performance Analytics</h3>
                <p className="text-sm text-muted-foreground">
                  Visualize your academic performance with detailed charts and progress indicators.
                </p>
              </div>
              
              <div className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <AlertTriangle className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 font-semibold text-card-foreground">Risk Detection</h3>
                <p className="text-sm text-muted-foreground">
                  Early warning system to identify students at risk and enable timely interventions.
                </p>
              </div>
              
              <div className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 font-semibold text-card-foreground">Moodle Integration</h3>
                <p className="text-sm text-muted-foreground">
                  Seamlessly works alongside your existing Moodle LMS for enhanced tracking.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
