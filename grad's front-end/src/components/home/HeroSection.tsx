import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, BookOpen, Shield } from "lucide-react";
import heroImage from "@/assets/hero-study.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-[600px] w-full overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Students studying together"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-hero-overlay/75" />
      </div>
      
      {/* Content */}
      <div className="container relative z-10 flex min-h-[600px] flex-col items-center justify-center py-20 text-center">
        <h1 className="mb-6 max-w-4xl text-4xl font-bold leading-tight text-primary-foreground md:text-5xl lg:text-6xl">
          Empower Your Academic Journey
        </h1>
        <p className="mb-8 max-w-2xl text-lg text-primary-foreground/90 md:text-xl">
          A comprehensive student performance tracking platform designed to work alongside Moodle LMS. Monitor your courses, identify risks early, and achieve academic excellence.
        </p>
        
        {/* Feature Pills */}
        <div className="mb-10 flex flex-wrap justify-center gap-4">
          <div className="flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 backdrop-blur-sm">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
            <span className="text-sm font-medium text-primary-foreground">Performance Tracking</span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 backdrop-blur-sm">
            <BookOpen className="h-5 w-5 text-primary-foreground" />
            <span className="text-sm font-medium text-primary-foreground">Course Management</span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 backdrop-blur-sm">
            <Shield className="h-5 w-5 text-primary-foreground" />
            <span className="text-sm font-medium text-primary-foreground">Risk Monitoring</span>
          </div>
        </div>
        
        <Button 
          asChild 
          size="lg" 
          className="group bg-primary-foreground text-primary hover:bg-primary-foreground/90"
        >
          <Link to="/signin">
            Get Started
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </div>
    </section>
  );
};

export default HeroSection;
