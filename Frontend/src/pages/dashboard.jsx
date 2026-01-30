import "../styles/dashboard.css"; 
import DashboardCard from "../components/DashboardCard";
import LineChart from "../components/LineChart"; 
import Particles from "react-tsparticles";
import TopStats from "../components/TopStats";

export default function Dashboard() {
  const predictionData = {
    riskLevel: "Medium",
    finalPrediction: "Pass",
    engagement: "High",
    weakTopics: "Data Structures",
    trendLabels: ["Week 1", "Week 2", "Week 3", "Week 4"],
    engagementTrend: [65, 70, 80, 75],
    predictionTrend: [1, 0, 1, 1],
    sparkline: [60, 65, 70, 75, 80],
  };

  return (
    <div className="dashboard-container">
      {/* Particle background */}
      <Particles
        options={{
          background: { color: { value: "transparent" } },
          fpsLimit: 60,
          particles: {
            number: { value: 40, density: { enable: true, value_area: 800 } },
            color: { value: "#ffffff" },
            shape: { type: "circle" },
            opacity: { value: 0.1 },
            size: { value: 2 },
            move: { enable: true, speed: 1, direction: "none" },
          },
          interactivity: {
            events: { onHover: { enable: true, mode: "repulse" } },
          },
        }}
      />

      <header className="dashboard-header">
        <h1>AcademIQ Dashboard</h1>
        <p>AI-powered academic performance insights</p>
      </header>

      <section className="dashboard-grid">
        <DashboardCard
          title="Final Prediction"
          value={predictionData.finalPrediction}
          accent="green"
          trend="up"
          sparklineData={predictionData.sparkline}
        />
        <DashboardCard
          title="Risk Level"
          value={predictionData.riskLevel}
          accent="orange"
          trend="down"
          sparklineData={predictionData.sparkline}
        />
        <DashboardCard
          title="Engagement Level"
          value={predictionData.engagement}
          accent="blue"
          trend="up"
          sparklineData={predictionData.sparkline}
        />
        <DashboardCard
          title="Weak Topic"
          value={predictionData.weakTopics}
          accent="red"
          sparklineData={predictionData.sparkline}
        />
      </section>

      <section className="dashboard-charts">
        <div className="chart-card">
          <h3>Engagement Trend</h3>
          <LineChart
            labels={predictionData.trendLabels}
            data={predictionData.engagementTrend}
            label="Engagement %"
            color="#3498db"
          />
        </div>

        <div className="chart-card">
          <h3>Prediction Trend</h3>
          <LineChart
            labels={predictionData.trendLabels}
            data={predictionData.predictionTrend}
            label="Pass / Fail"
            color="#2ecc71"
          />
        </div>
      </section>
    </div>
  );
}
