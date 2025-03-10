import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Cell, PieChart, Pie, ReferenceLine 
} from 'recharts';
import { transformBudgetCSV, identifyProjectRedFlags } from '../utils/dataNormalizer';

/**
 * Standardized Construction Dashboard 
 * Can be used with any project budget CSV with consistent column structure
 */
const ConstructionDashboard = ({ 
  projectFile,          // CSV filename to analyze 
  projectMeta = {},     // Project metadata
  companyLogo = null,   // Optional company logo URL
  companyName = "Construction Company" // Company name
}) => {
  // State for dashboard data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    projectData: {
      projectName: projectMeta.projectName || "Construction Project",
      startDate: "",
      endDate: "",
      currentDate: new Date().toLocaleDateString(),
      daysElapsed: 0,
      totalDuration: "",
      percentTimeElapsed: 0,
      totalBudget: "$0",
      totalBilled: "$0",
      percentBilled: 0,
      projectedFinal: "$0",
      projectedOverage: "$0",
      percentOverage: 0
    },
    budgetData: [],
    timeData: [],
    budgetSpentData: [],
    costTypeData: [],
    divisionData: [],
    keyFindings: []
  });

  // Load and process budget data
  useEffect(() => {
    const loadData = async () => {
      if (!projectFile) {
        setError("No project file specified");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Transform budget CSV data
        const normalizedData = await transformBudgetCSV(projectFile, projectMeta);
        
        // Identify key findings and red flags
        const findings = identifyProjectRedFlags(normalizedData);
        
        // Set dashboard data
        setDashboardData({
          ...normalizedData,
          keyFindings: findings
        });
        
        setLoading(false);
      } catch (err) {
        console.error("Error loading project data:", err);
        setError(`Failed to load project data: ${err.message}`);
        setLoading(false);
      }
    };

    loadData();
  }, [projectFile, projectMeta]);

  // Helper format functions
  const formatCurrency = (value) => {
    if (typeof value === 'string') {
      value = parseFloat(value.replace(/[^0-9.-]+/g, ''));
    }
    
    if (isNaN(value)) return "$0";
    
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    } else {
      return `$${value}`;
    }
  };
  
  // Status color mapping
  const getStatusColor = (percent, expected = 50) => {
    // Calculate how far ahead/behind expected progress
    const ratio = percent / expected;
    
    if (ratio >= 1.5) return "#38A169"; // green - significantly ahead
    if (ratio >= 0.9) return "#3182CE"; // blue - on track
    if (ratio >= 0.6) return "#ED8936"; // orange - somewhat behind
    return "#E53E3E"; // red - significantly behind
  };

  // Show loading state
  if (loading) {
    return <div className="p-4 text-center">Loading project data...</div>;
  }

  // Show error state
  if (error) {
    return <div className="p-4 text-center text-red-600">{error}</div>;
  }

  const { 
    projectData, budgetData, timeData, budgetSpentData, 
    costTypeData, divisionData, keyFindings 
  } = dashboardData;

  return (
    <div className="p-4 max-w-6xl mx-auto bg-gray-50">
      {/* Company Logo */}
      {companyLogo && (
        <div className="mb-6 flex justify-start">
          <img src={companyLogo} alt={`${companyName} Logo`} className="h-12" />
        </div>
      )}
      
      {/* Project Header */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h1 className="text-2xl font-bold text-center mb-4">{projectData.projectName} - Project Status Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-4 rounded border border-gray-200">
            <h2 className="text-lg font-semibold text-center mb-3">Current Project Status</h2>
            <div className="flex flex-row items-center justify-center">
              <div className="w-1/2">
                <h3 className="text-center text-base font-semibold mb-1">% Billed</h3>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={budgetSpentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={50}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => name === 'Budget Spent' ? `${value.toFixed(1)}%` : ''}
                      labelLine={false}
                    >
                      <Cell fill="#38A169" /> {/* Green for billed */}
                      <Cell fill="#E2E8F0" /> {/* Light gray for remaining */}
                    </Pie>
                    <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="text-center text-sm font-semibold">
                  {formatCurrency(projectData.totalBilled)} / {formatCurrency(projectData.totalBudget)}
                </div>
              </div>
              <div className="w-1/2">
                <h3 className="text-center text-base font-semibold mb-1">Schedule Progress</h3>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={timeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={50}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => name === 'Time Elapsed' ? `${value.toFixed(1)}%` : ''}
                      labelLine={false}
                    >
                      <Cell fill="#3182CE" /> {/* Blue for elapsed */}
                      <Cell fill="#E2E8F0" /> {/* Light gray for remaining */}
                    </Pie>
                    <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="text-center text-sm font-semibold">
                  {projectData.daysElapsed} days / {projectData.totalDuration}
                </div>
              </div>
            </div>
            <div className="text-center mt-3 text-sm font-semibold text-red-600">
              {projectData.percentTimeElapsed > projectData.percentBilled 
                ? `Project is ${(projectData.percentTimeElapsed - projectData.percentBilled).toFixed(2)}% behind schedule`
                : `Project is ${(projectData.percentBilled - projectData.percentTimeElapsed).toFixed(2)}% ahead of schedule`
              }
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <div className="text-sm font-semibold text-blue-800">Timeline</div>
              <div className="mt-1">{projectData.startDate} - {projectData.endDate}</div>
            </div>
            
            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <div className="text-sm font-semibold text-blue-800">Current Date</div>
              <div className="mt-1">{projectData.currentDate}</div>
            </div>
            
            <div className="bg-green-50 p-3 rounded border border-green-200">
              <div className="text-sm font-semibold text-green-800">Budget</div>
              <div className="mt-1">{projectData.totalBudget}</div>
            </div>
            
            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <div className="text-sm font-semibold text-blue-800">Projected Overrun</div>
              <div className="mt-1">{projectData.projectedOverage} ({projectData.percentOverage.toFixed(2)}%)</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Key Findings */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-bold mb-4">Key Findings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {keyFindings.length > 0 ? (
            keyFindings.map((finding, index) => (
              <div 
                key={index} 
                className={`p-4 rounded border ${
                  finding.type === 'danger' 
                    ? 'bg-red-50 border-red-300' 
                    : finding.type === 'warning'
                      ? 'bg-yellow-50 border-yellow-300'
                      : 'bg-blue-50 border-blue-300'
                }`}
              >
                <div className="font-bold mb-1">{finding.title}</div>
                <div className="text-sm mb-2">{finding.description}</div>
                <div className="text-sm italic">Recommendation: {finding.recommendation}</div>
              </div>
            ))
          ) : (
            <div className="col-span-2 p-4 text-center">
              No critical issues detected in current project data.
            </div>
          )}
        </div>
      </div>
      
      {/* Progress Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-4 shadow rounded">
          <h2 className="text-lg font-bold mb-4 text-center">Project Progress</h2>
          <div className="flex flex-col md:flex-row items-center justify-center">
            <div className="w-full md:w-1/2">
              <h3 className="text-center text-base font-semibold mb-2">Time Elapsed</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={timeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ value }) => `${value.toFixed(1)}%`}
                    labelLine={false}
                  >
                    <Cell fill="#3182CE" />
                    <Cell fill="#EDF2F7" />
                  </Pie>
                  <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2">
              <h3 className="text-center text-base font-semibold mb-2">Budget Spent</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={budgetSpentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ value }) => `${value.toFixed(1)}%`}
                    labelLine={false}
                  >
                    <Cell fill="#38A169" />
                    <Cell fill="#F0FFF4" />
                  </Pie>
                  <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="text-center mt-2 text-red-600 font-semibold">
            {projectData.percentTimeElapsed > projectData.percentBilled
              ? `Time Elapsed (${projectData.percentTimeElapsed.toFixed(1)}%) exceeds Budget Spent (${projectData.percentBilled.toFixed(1)}%) by ${(projectData.percentTimeElapsed - projectData.percentBilled).toFixed(1)}%`
              : `Budget Spent (${projectData.percentBilled.toFixed(1)}%) exceeds Time Elapsed (${projectData.percentTimeElapsed.toFixed(1)}%) by ${(projectData.percentBilled - projectData.percentTimeElapsed).toFixed(1)}%`
            }
          </div>
        </div>
        
        <div className="bg-white p-4 shadow rounded">
          <h2 className="text-lg font-bold mb-4 text-center">Completion by Cost Type</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={costTypeData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(value) => `${value}%`} />
              <YAxis type="category" dataKey="name" width={80} />
              <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
              <Legend />
              <ReferenceLine 
                x={projectData.percentTimeElapsed} 
                stroke="#718096" 
                strokeDasharray="3 3" 
                label={{ value: 'Expected', position: 'top', fill: '#718096' }} 
              />
              <Bar dataKey="complete" name="Complete">
                {costTypeData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getStatusColor(entry.complete, entry.expectedComplete)} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Budget Comparison */}
      <div className="bg-white p-4 shadow rounded mb-6">
        <h2 className="text-lg font-bold mb-4 text-center">Budget vs. Projected Cost by Major Cost Code</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={budgetData}
            margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              angle={-45} 
              textAnchor="end" 
              height={100} 
              tick={{ fontSize: 12 }}
            />
            <YAxis tickFormatter={formatCurrency} />
            <Tooltip formatter={(value) => `${value.toLocaleString()}`} />
            <Legend />
            <Bar name="Budget" dataKey="budget" fill="#3182CE" />
            <Bar name="Projected Cost" dataKey="projected" fill="#E53E3E">
              {budgetData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.projected > entry.budget ? '#E53E3E' : 
                        entry.projected < entry.budget ? '#38A169' : '#3182CE'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Division Progress */}
      <div className="bg-white p-4 shadow rounded mb-6">
        <h2 className="text-lg font-bold mb-4 text-center">Completion by Division</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={divisionData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={(value) => `${value}%`} />
            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
            <Legend />
            <ReferenceLine 
              x={projectData.percentTimeElapsed} 
              stroke="#718096" 
              strokeDasharray="3 3" 
              label={{ value: 'Expected Progress', position: 'top', fill: '#718096' }} 
            />
            <Bar dataKey="complete" name="Percent Complete" fill="#3182CE">
              {divisionData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getStatusColor(entry.complete, entry.expected)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Summary & Recommendations */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Summary & Recommendations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded border border-blue-200">
            <h3 className="font-bold text-blue-800 mb-2">Schedule Status</h3>
            <ul className="list-disc pl-5 text-sm">
              {projectData.percentTimeElapsed > projectData.percentBilled ? (
                <>
                  <li>Project is {(projectData.percentTimeElapsed - projectData.percentBilled).toFixed(1)}% behind schedule</li>
                  <li>Consider expediting critical path activities</li>
                  <li>Review resource allocation to increase pace</li>
                  <li>Focus on divisions significantly behind expected progress</li>
                </>
              ) : (
                <>
                  <li>Project is {(projectData.percentBilled - projectData.percentTimeElapsed).toFixed(1)}% ahead of schedule</li>
                  <li>Maintain current pace and monitor quality</li>
                  <li>Ensure early completions align with project sequencing</li>
                  <li>Verify that billings reflect actual physical progress</li>
                </>
              )}
            </ul>
          </div>
          
          <div className="p-4 bg-blue-50 rounded border border-blue-200">
            <h3 className="font-bold text-blue-800 mb-2">Budget Management</h3>
            <ul className="list-disc pl-5 text-sm">
              {parseFloat(projectData.percentOverage) > 0 ? (
                <>
                  <li>Projected overrun of {projectData.projectedOverage} ({projectData.percentOverage.toFixed(1)}% over budget)</li>
                  <li>Implement cost control measures for remaining work</li>
                  <li>Review change order management process</li>
                  <li>Identify opportunities for value engineering</li>
                </>
              ) : (
                <>
                  <li>Project is currently {formatCurrency(Math.abs(parseFloat(projectData.projectedOverage.replace(/[^0-9.-]+/g, ''))))} under budget</li>
                  <li>Continue monitoring cost performance</li>
                  <li>Document cost-saving measures for future projects</li>
                  <li>Consider potential quality or scope improvements if budget remains favorable</li>
                </>
              )}
            </ul>
          </div>
          
          <div className="p-4 bg-blue-50 rounded border border-blue-200">
            <h3 className="font-bold text-blue-800 mb-2">Cost Type Analysis</h3>
            <ul className="list-disc pl-5 text-sm">
              {costTypeData.map((costType, index) => {
                const variance = costType.complete - costType.expectedComplete;
                const status = variance >= 5 ? 'ahead of schedule' : 
                               variance >= -5 ? 'on schedule' : 
                               variance >= -15 ? 'slightly behind' : 'significantly behind';
                               
                return (
                  <li key={index}>
                    {costType.name}: {costType.complete.toFixed(1)}% complete ({status})
                  </li>
                );
              })}
            </ul>
          </div>
          
          <div className="p-4 bg-blue-50 rounded border border-blue-200">
            <h3 className="font-bold text-blue-800 mb-2">Next Steps</h3>
            <ul className="list-disc pl-5 text-sm">
              <li>Update project forecast and schedule</li>
              <li>Review findings with project team and stakeholders</li>
              <li>Implement recommended corrective actions</li>
              <li>Schedule follow-up review in 2-4 weeks</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConstructionDashboard;