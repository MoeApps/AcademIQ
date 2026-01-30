export default function DashboardCard({ title, value, accent }) {
    return (
      <div className={`dashboard-card accent-${accent}`}>
        <h3>{title}</h3>
        <p>{value}</p>
      </div>
    );
  }
  