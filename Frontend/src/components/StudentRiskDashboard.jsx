import React from "react";

const StudentRiskDashboard = ({ features, risk }) => {
  if (!features && !risk) return <p>No student data loaded yet.</p>;

  return (
    <div style={{ padding: "1rem", fontFamily: "Arial, sans-serif" }}>
      <h2>Student Risk Dashboard</h2>

      {features && (
        <div style={{ marginBottom: "1rem" }}>
          <h3>Computed Features</h3>
          <ul>
            {Object.entries(features).map(([key, value]) => (
              <li key={key}><strong>{key}:</strong> {value.toString()}</li>
            ))}
          </ul>
        </div>
      )}

      {risk && (
        <div>
          <h3>Risk Cluster</h3>
          <p><strong>Cluster:</strong> {risk.risk_cluster} ({risk.risk_cluster_encoded})</p>
          <p><strong>Recommendation:</strong> {risk.recommendation}</p>
        </div>
      )}
    </div>
  );
};

export default StudentRiskDashboard;
