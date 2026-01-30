import CountUp from "react-countup";
import { FaArrowUp, FaArrowDown, FaExclamationCircle, FaGraduationCap } from "react-icons/fa";

export default function TopStats({ stats }) {
  return (
    <div className="top-stats-grid">
      {stats.map((stat, index) => {
        let Icon = null;
        if (stat.title === "Final Prediction") Icon = FaGraduationCap;
        if (stat.title === "Risk Level") Icon = FaExclamationCircle;
        if (stat.title === "Engagement Level") Icon = FaArrowUp;
        if (stat.title === "Weak Topic") Icon = FaExclamationCircle;

        let trendColor = stat.trend === "up" ? "#2ecc71" : "#e74c3c";

        return (
          <div key={index} className={`top-stat-card accent-${stat.accent}`}>
            <div className="top-stat-header">
              {Icon && <Icon size={24} className="stat-icon" />}
              <h4>{stat.title}</h4>
            </div>
            <div className="top-stat-value">
              {typeof stat.value === "number" ? (
                <CountUp end={stat.value} duration={2} />
              ) : (
                stat.value
              )}
              {stat.trend && (
                <span className="trend-arrow" style={{ color: trendColor }}>
                  {stat.trend === "up" ? "↑" : "↓"}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
