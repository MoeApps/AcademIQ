import { useState } from "react";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import DashboardCard from "../components/DashboardCard";

export default function Dashboard() {
  const [filter, setFilter] = useState("all");

  
  const rawData = {
    pass: 80,
    fail: 40,
  };
  
  let passFailData = [];
  
  if (filter === "all") {
    passFailData = [
      { name: "Pass", value: rawData.pass },
      { name: "Fail", value: rawData.fail },
    ];
  } else if (filter === "pass") {
    passFailData = [{ name: "Pass", value: rawData.pass }];
  } else {
    passFailData = [{ name: "Fail", value: rawData.fail }];
  }
  

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">
        Student Performance Dashboard
      </h1>

      {/* Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <DashboardCard
          title="Total Students"
          value="120"
          color="text-blue-600"
        />
        <DashboardCard
          title="Passing Students"
          value="80"
          color="text-green-600"
        />
        <DashboardCard
          title="Failing Students"
          value="40"
          color="text-red-600"
        />
      </div>

      
      <select
  value={filter}
  onChange={(e) => setFilter(e.target.value)}
  className="mb-4 p-2 border rounded-md"
>
  <option value="all">All Students</option>
  <option value="pass">Passing Only</option>
  <option value="fail">Failing Only</option>
</select>


      {/* Chart Section */}
      <div className="bg-white rounded-xl shadow-md p-6 h-96">
        <h2 className="text-gray-700 mb-4 font-semibold">
          Pass vs Fail Distribution
        </h2>

        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={passFailData}
              dataKey="value"
              nameKey="name"
              outerRadius={90}
            >
              <Cell fill="#22c55e" />
              <Cell fill="#ef4444" />
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
