interface Agent {
  name: string;
  ticketsHandled: number;
  avgResponseTime: number;
  satisfactionScore: number;
}

interface AgentPerformanceTableProps {
  agents: Agent[];
}

export default function AgentPerformanceTable({ agents }: AgentPerformanceTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Performance</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="pb-3 text-sm font-medium text-gray-500">Agent</th>
              <th className="pb-3 text-sm font-medium text-gray-500">Tickets</th>
              <th className="pb-3 text-sm font-medium text-gray-500">Avg Response</th>
              <th className="pb-3 text-sm font-medium text-gray-500">CSAT</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent) => (
              <tr key={agent.name} className="border-b border-gray-50">
                <td className="py-3 text-sm font-medium text-gray-900">{agent.name}</td>
                <td className="py-3 text-sm text-gray-600">{agent.ticketsHandled}</td>
                <td className="py-3 text-sm text-gray-600">{agent.avgResponseTime} min</td>
                <td className="py-3 text-sm">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      agent.satisfactionScore >= 4.5
                        ? "bg-green-100 text-green-700"
                        : agent.satisfactionScore >= 4.0
                        ? "bg-blue-100 text-blue-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {agent.satisfactionScore.toFixed(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
