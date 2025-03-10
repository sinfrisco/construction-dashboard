import React from 'react';
import ConstructionDashboard from './templates/ConstructionDashboard';
import useProjectData from '../hooks/useProjectData';

/**
 * ConfigurableConstructionDashboard
 * A simple configuration-based wrapper for the construction dashboard
 * 
 * Easy to use with minimal code:
 * <ConfigurableConstructionDashboard 
 *   budgetFile="budget.csv"
 *   projectName="My Project"
 *   startDate="2023-01-01"
 *   endDate="2024-06-30"
 *   companyName="ABC Construction"
 * />
 */
const ConfigurableConstructionDashboard = ({
  // Required props
  budgetFile,
  
  // Project details
  projectName = "Construction Project",
  startDate,
  endDate,
  currentDate = new Date().toLocaleDateString(),
  
  // Company details
  companyName = "Construction Company",
  companyLogo = null,
  
  // Dashboard customization
  showDivisionProgress = true,
  showCostTypeAnalysis = true,
  showBudgetComparison = true,
  showKeyFindings = true,
  showRecommendations = true,
  
  // Theme customization
  themeColors = {
    primary: '#3182CE',
    success: '#38A169',
    warning: '#ED8936',
    danger: '#E53E3E',
    neutral: '#718096'
  }
}) => {
  // Create project metadata object
  const projectMeta = {
    projectName,
    startDate,
    endDate,
    currentDate
  };
  
  // Use custom hook to load project data
  const { loading, error, projectData } = useProjectData(budgetFile, projectMeta);
  
  // Handle loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project data...</p>
        </div>
      </div>
    );
  }
  
  // Handle error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-2xl mx-auto my-8">
        <h2 className="text-red-700 text-lg font-semibold mb-2">Error Loading Project Data</h2>
        <p className="text-red-600">{error}</p>
        <p className="mt-4 text-sm text-gray-600">
          Please check that the budget file exists and is in the correct format.
        </p>
      </div>
    );
  }
  
  // If no data is available yet
  if (!projectData) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-2xl mx-auto my-8">
        <h2 className="text-yellow-700 text-lg font-semibold mb-2">No Project Data Available</h2>
        <p className="text-yellow-600">
          Unable to load project data. Please check the budget file and try again.
        </p>
      </div>
    );
  }
  
  // Configure which sections to display
  const dashboardConfig = {
    sections: {
      divisionProgress: showDivisionProgress,
      costTypeAnalysis: showCostTypeAnalysis,
      budgetComparison: showBudgetComparison,
      keyFindings: showKeyFindings,
      recommendations: showRecommendations
    },
    theme: themeColors,
    companyInfo: {
      name: companyName,
      logo: companyLogo
    }
  };
  
  // Render the dashboard with the loaded data and configuration
  return (
    <ConstructionDashboard
      data={projectData}
      config={dashboardConfig}
    />
  );
};

export default ConfigurableConstructionDashboard;