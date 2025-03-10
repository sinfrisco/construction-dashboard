import React from 'react';
import './App.css';
import ConstructionDashboard from './components/dashboard/ConstructionDashboard';

function App() {
  return (
    <div className="App">
      <ConstructionDashboard 
        projectFile="/data/project-budget.csv"
        projectMeta={{
          projectName: "Your Project Name",
          startDate: "January 1, 2024",
          endDate: "December 31, 2025",
          currentDate: "March 9, 2025"
        }}
      />
    </div>
  );
}

export default App;
