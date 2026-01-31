import "../styles/dashboard.css"; 
import DashboardCard from "../components/DashboardCard";
import LineChart from "../components/LineChart"; 
import Particles from "react-tsparticles";
import StudentRiskDashboard from "../components/StudentRiskDashboard";
import { useState } from "react";

export default function Dashboard() {
  const [studentFeatures, setStudentFeatures] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Corrected student JSON (float for scores)
  const selectedStudent = {
    student_id: "12345",
    sessions: [
      { date: "2026-01-01", duration_minutes: 60 },
      { date: "2026-01-02", duration_minutes: 45 }
    ],
    courses: [
      { course_id: "C101", enrolled: true },
      { course_id: "C102", enrolled: true }
    ],
    assignments: [
      { assignment_id: "A1", score: 85.0, submitted_on_time: true },
      { assignment_id: "A2", score: 70.0, submitted_on_time: false }
    ],
    quizzes: [
      { quiz_id: "Q1", score: 80.0 },
      { quiz_id: "Q2", score: 90.0 }
    ],
    final_grade: 82.0
  };

  // Fetch features + risk cluster
  const fetchStudentRisk = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("Sending Moodle data:", selectedStudent);

      // /ingest
      const ingestRes = await fetch("http://localhost:8000/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedStudent)
      });
      if (!ingestRes.ok) throw new Error(`Ingest failed: ${ingestRes.statusText}`);
      const features = await ingestRes.json();
      setStudentFeatures(features);

      // /predict
      const predictRes = await fetch("http://localhost:8000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(features)
      });
      if (!predictRes.ok) throw new Error(`Predict failed: ${predictRes.statusText}`);
      const risk = await predictRes.json();
      setRiskData(risk);

      console.log("Features:", features, "Risk:", risk);
    } catch (err) {
      console.error(err);
      setError(err.message);
      setStudentFeatures(null);
      setRiskData(null);
    } finally {
      setLoading(false);
    }
  };

  const predictionCards = [
    { title: "Final Prediction", value: riskData?.finalPrediction || "—", accent: "green", trend: "up", sparklineData: studentFeatures?.trend || [] },
    { title: "Risk Level", value: riskData?.risk_cluster || "—", accent: "orange", trend: "down", sparklineData: studentFeatures?.trend || [] },
    { title: "Engagement Level", value: studentFeatures?.engagement || "—", accent: "blue", trend: "up", sparklineData: studentFeatures?.trend || [] },
    { title: "Weak Topic", value: riskData?.weakTopics || "—", accent: "red", sparklineData: studentFeatures?.trend || [] }
  ];

  return (
    <div className="dashboard-container">
      <div style={{ margin: "1rem 0" }}>
        <button onClick={fetchStudentRisk} disabled={loading}>
          {loading ? "Loading..." : "Refresh Data"}
        </button>
        {error && <span style={{ color: "red", marginLeft: "1rem" }}>{error}</span>}
      </div>

      <Particles
        options={{
          background: { color: { value: "transparent" } },
          fpsLimit: 60,
          particles: { number: { value: 40, density: { enable: true, value_area: 800 } }, color: { value: "#ffffff" }, shape: { type: "circle" }, opacity: { value: 0.1 }, size: { value: 2 }, move: { enable: true, speed: 1, direction: "none" } },
          interactivity: { events: { onHover: { enable: true, mode: "repulse" } } }
        }}
      />

      <header className="dashboard-header">
        <h1>AcademIQ Dashboard</h1>
        <p>AI-powered academic performance insights</p>
      </header>

      <section className="dashboard-grid">
        {predictionCards.map(card => (
          <DashboardCard key={card.title} {...card} />
        ))}
      </section>

      <section className="dashboard-charts">
        <div className="chart-card">
          <h3>Engagement Trend</h3>
          <LineChart labels={studentFeatures?.trendLabels || ["Week 1"]} data={studentFeatures?.engagementTrend || [0]} label="Engagement %" color="#3498db" />
        </div>
        <div className="chart-card">
          <h3>Prediction Trend</h3>
          <LineChart labels={studentFeatures?.trendLabels || ["Week 1"]} data={studentFeatures?.predictionTrend || [0]} label="Pass / Fail" color="#2ecc71" />
        </div>
      </section>

      <section className="student-risk-dashboard">
        <StudentRiskDashboard features={studentFeatures} risk={riskData} />
      </section>
    </div>
  );
}
