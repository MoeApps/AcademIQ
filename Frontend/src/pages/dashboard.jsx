import "../styles/dashboard.css";
import DashboardCard from "../components/DashboardCard";
import LineChart from "../components/LineChart";

export default function Dashboard() {
  // Mock backend data
  const predictionData = {
    riskLevel: "Medium",
    finalPrediction: "Pass",
    engagement: "High",
    weakTopics: "Data Structures",
    trendLabels: ["Week 1", "Week 2", "Week 3", "Week 4"],
    engagementTrend: [65, 70, 80, 75],
    predictionTrend: [1, 0, 1, 1], // 1=Pass, 0=Fail
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <h1>AcademIQ Dashboard</h1>
        <p>AI-powered academic performance insights</p>
      </header>

      {/* Cards */}
      <section className="dashboard-grid">
        <DashboardCard
          title="Final Prediction"
          value={predictionData.finalPrediction}
          accent="green"
        />
        <DashboardCard
          title="Risk Level"
          value={predictionData.riskLevel}
          accent="orange"
        />
        <DashboardCard
          title="Engagement Level"
          value={predictionData.engagement}
          accent="blue"
        />
        <DashboardCard
          title="Weak Topic"
          value={predictionData.weakTopics}
          accent="red"
        />
      </section>

      {/* Charts */}
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
