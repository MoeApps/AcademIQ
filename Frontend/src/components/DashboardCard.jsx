import { FaArrowUp, FaArrowDown, FaExclamationCircle, FaGraduationCap } from "react-icons/fa";
import { Line } from "react-chartjs-2";

export default function DashboardCard({ title, value, accent, trend, sparklineData }) {
  // Determine trend icon
  let TrendIcon = null;
  let trendColor = "#fff";
  if (trend === "up") { TrendIcon = FaArrowUp; trendColor = "#2ecc71"; }
  else if (trend === "down") { TrendIcon = FaArrowDown; trendColor = "#e74c3c"; }

  // Card Icon
  let CardIcon = null;
  if (title === "Final Prediction") CardIcon = FaGraduationCap;
  if (title === "Risk Level") CardIcon = FaExclamationCircle;
  if (title === "Engagement Level") CardIcon = FaArrowUp;
  if (title === "Weak Topic") CardIcon = FaExclamationCircle;

  return (
    <div className={`dashboard-card accent-${accent}`}>
      <div className="card-header">
        {CardIcon && <CardIcon size={24} className="card-icon" />}
        <h3>{title}</h3>
      </div>

      <div className="card-value">
        <p>{value}</p>
        {TrendIcon && <TrendIcon size={18} color={trendColor} className="trend-icon" />}
      </div>

      {sparklineData && (
        <div className="sparkline">
          <Line
            data={{
              labels: sparklineData.map((_, i) => i + 1),
              datasets: [
                {
                  data: sparklineData,
                  borderColor: "#fff",
                  backgroundColor: "rgba(255,255,255,0.2)",
                  fill: true,
                  tension: 0.3,
                  pointRadius: 0,
                },
              ],
            }}
            options={{
              responsive: true,
              plugins: { legend: { display: false } },
              scales: { x: { display: false }, y: { display: false } },
            }}
          />
        </div>
      )}

      <div className="gradient-bar"></div>
    </div>
  );
}
