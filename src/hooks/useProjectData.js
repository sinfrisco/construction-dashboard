import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';
import { normalizeBudgetData, identifyProjectRedFlags } from '../utils/dataNormalizer';

/**
 * Custom hook to load and process construction project data
 * 
 * @param {string} budgetFilePath - Path to the budget CSV file
 * @param {Object} projectMeta - Project metadata (name, dates, etc.)
 * @returns {Object} - Loading state, error state, and processed project data
 */
const useProjectData = (budgetFilePath, projectMeta = {}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projectData, setProjectData] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      if (!budgetFilePath) {
        setError("No budget file specified");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Read the budget CSV file
        const response = await window.fs.readFile(budgetFilePath, { encoding: 'utf8' });
        
        // Parse the CSV data
        const parsedData = Papa.parse(response, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
          delimitersToGuess: [',', '\t', '|', ';'],
          transformHeader: header => header.trim()
        });
        
        if (parsedData.errors && parsedData.errors.length > 0) {
          console.warn("CSV parsing warnings:", parsedData.errors);
        }
        
        // Normalize the data for the dashboard
        const normalizedData = normalizeBudgetData(parsedData.data, projectMeta);
        
        // Identify key findings and red flags
        const findings = identifyProjectRedFlags(normalizedData);
        
        // Set the processed data
        setProjectData({
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
  }, [budgetFilePath, projectMeta]);

  return { loading, error, projectData };
};

export default useProjectData;