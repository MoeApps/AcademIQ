import { MarketingHeader } from "@/components/layout/MarketingHeader";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { StatsStrip } from "@/components/home/StatsStrip";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { AIModelsSection } from "@/components/home/AIModelsSection";
import { FeatureShowcase } from "@/components/home/FeatureShowcase";
import { CTASection } from "@/components/home/CTASection";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex-1">
        <HeroSection />
        <StatsStrip />
        <FeaturesSection />
        <HowItWorksSection />
        <AIModelsSection />
        <FeatureShowcase />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
