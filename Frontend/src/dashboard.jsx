import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function Dashboard() {
  // Temporary fake data (we’ll replace this later with backend data)
  const passFailData = [
    { name: "Pass", value: 80 },
    { name: "Fail", value: 40 },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">
        Student Performance Dashboard
      </h1>

      {/* Metric Card */}
      <div className="bg-white rounded-xl shadow-md p-6 w-64">
        <h2 className="text-gray-500 text-sm">
          Total Students
        </h2>
        <p className="text-4xl font-bold text-blue-600">
          120
        </p>
      </div>

      {/* Chart Card */}
      <div className="bg-white rounded-xl shadow-md p-6 mt-8 w-80 h-80">
        <h2 className="text-gray-700 mb-4 font-semibold">
          Pass vs Fail
        </h2>

        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={passFailData}
              dataKey="value"
              nameKey="name"
              outerRadius={80}
            >
              <Cell fill="#22c55e" /> {/* Green */}
              <Cell fill="#ef4444" /> {/* Red */}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
