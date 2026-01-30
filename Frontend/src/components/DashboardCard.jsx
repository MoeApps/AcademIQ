export default function DashboardCard({ title, value, color }) {
    return (
        
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-gray-500 text-sm mb-1">
          {title}
        </h2>
        <p className={`text-4xl font-bold ${color}`}>
          {value}
        </p>
      </div>
      
    );
  }
  
  