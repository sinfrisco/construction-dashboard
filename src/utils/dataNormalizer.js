/**
 * Data normalizer for construction project budget data
 * Transforms raw CSV data into standardized format for dashboard consumption
 */

import _ from 'lodash';

/**
 * Main function to process and transform budget CSV data into dashboard format
 * @param {Array} rawBudgetData - The parsed CSV data as an array of objects
 * @param {Object} projectMeta - Project metadata (name, dates, etc.)
 * @returns {Object} Normalized data ready for dashboard consumption
 */
export const normalizeBudgetData = (rawBudgetData, projectMeta) => {
  // Create empty result structure with all required dashboard data properties
  const result = {
    projectData: {
      projectName: projectMeta?.projectName || "Construction Project",
      startDate: projectMeta?.startDate || "",
      endDate: projectMeta?.endDate || "",
      currentDate: projectMeta?.currentDate || new Date().toLocaleDateString(),
      daysElapsed: 0,
      totalDuration: "",
      percentTimeElapsed: 0,
      totalBudget: 0,
      totalBilled: 0,
      percentBilled: 0,
      projectedFinal: 0,
      projectedOverage: 0,
      percentOverage: 0
    },
    budgetData: [],
    timeData: [],
    budgetSpentData: [],
    costTypeData: [],
    divisionData: []
  };

  if (!rawBudgetData || rawBudgetData.length === 0) {
    console.error("No budget data provided");
    return result;
  }

  try {
    // Calculate time-related metrics
    if (projectMeta?.startDate && projectMeta?.endDate) {
      const startDate = new Date(projectMeta.startDate);
      const endDate = new Date(projectMeta.endDate);
      const currentDate = new Date(projectMeta.currentDate || new Date());
      
      const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      const elapsedDays = Math.ceil((currentDate - startDate) / (1000 * 60 * 60 * 24));
      
      result.projectData.daysElapsed = elapsedDays;
      result.projectData.totalDuration = `${Math.ceil(totalDays / 30.4)} months`;
      result.projectData.percentTimeElapsed = parseFloat(((elapsedDays / totalDays) * 100).toFixed(2));
    }

    // Process budget totals
    let totalBudget = 0;
    let totalBilled = 0;
    let projectedFinalCost = 0;

    // Standardize column names based on common budget CSV formats
    const columnMap = detectAndMapColumns(rawBudgetData[0]);
    
    // Group data by divisions/cost codes and calculate aggregates
    const groupedByDivision = _.groupBy(rawBudgetData, row => {
      // Extract division from cost code (e.g., "03-305" -> "Div 3")
      const costCode = row[columnMap.costCode] || "";
      const divMatch = costCode.match(/^(\d+)/);
      return divMatch ? `Div ${divMatch[1]}` : "Other";
    });

    // Group by cost type (Labor, Material, Subcontract, Other)
    const groupedByCostType = _.groupBy(rawBudgetData, row => {
      return row[columnMap.costType] || "Other";
    });

    // Process totals
    totalBudget = sumField(rawBudgetData, columnMap.currentBudget);
    totalBilled = sumField(rawBudgetData, columnMap.billedToDate);
    projectedFinalCost = sumField(rawBudgetData, columnMap.projectedCost);

    // Calculate percentages
    const percentBilled = totalBudget > 0 ? (totalBilled / totalBudget) * 100 : 0;
    const projectedOverage = projectedFinalCost - totalBudget;
    const percentOverage = totalBudget > 0 ? (projectedOverage / totalBudget) * 100 : 0;

    // Update project data
    result.projectData.totalBudget = formatCurrency(totalBudget);
    result.projectData.totalBilled = formatCurrency(totalBilled);
    result.projectData.percentBilled = parseFloat(percentBilled.toFixed(2));
    result.projectData.projectedFinal = formatCurrency(projectedFinalCost);
    result.projectData.projectedOverage = formatCurrency(projectedOverage);
    result.projectData.percentOverage = parseFloat(percentOverage.toFixed(2));

    // Prepare time data
    result.timeData = [
      { name: 'Time Elapsed', value: result.projectData.percentTimeElapsed },
      { name: 'Time Remaining', value: 100 - result.projectData.percentTimeElapsed }
    ];

    // Prepare budget spent data
    result.budgetSpentData = [
      { name: 'Budget Spent', value: result.projectData.percentBilled },
      { name: 'Budget Remaining', value: 100 - result.projectData.percentBilled }
    ];

    // Process cost type data
    result.costTypeData = processCostTypeData(
      groupedByCostType, 
      columnMap, 
      result.projectData.percentTimeElapsed
    );

    // Process division data
    result.divisionData = processDivisionData(
      groupedByDivision, 
      columnMap, 
      result.projectData.percentTimeElapsed
    );

    // Process top budget items
    result.budgetData = processTopBudgetItems(rawBudgetData, columnMap);

    return result;
  } catch (error) {
    console.error("Error normalizing budget data:", error);
    return result;
  }
};

/**
 * Detects column mapping based on available headers in the CSV
 * Handles variations in column naming across different budget formats
 */
const detectAndMapColumns = (sampleRow) => {
  const keys = Object.keys(sampleRow);
  const map = {
    costCode: '',
    costCodeDescription: '',
    costType: '',
    currentBudget: '',
    billedToDate: '',
    percentBilled: '',
    projectedCost: '',
    variance: ''
  };

  // Try to match column names using common patterns
  for (const key of keys) {
    const lowerKey = key.toLowerCase();
    
    if (/cost.?code|budget.?code/.test(lowerKey)) {
      map.costCode = key;
    } 
    else if (/description|desc\.?/.test(lowerKey)) {
      map.costCodeDescription = key;
    }
    else if (/cost.?type|type/.test(lowerKey)) {
      map.costType = key;
    }
    else if (/current.?contract.?budget|current.?budget|e.{1,3}current/.test(lowerKey)) {
      map.currentBudget = key;
    }
    else if (/total.?billed|billed.?to.?date|j.{1,3}total.?billed/.test(lowerKey)) {
      map.billedToDate = key;
    }
    else if (/\%\s*billed|billed\s*\%/.test(lowerKey)) {
      map.percentBilled = key;
    }
    else if (/proj.*cost.*complet|forecast.*complet|q.{1,3}proj/.test(lowerKey)) {
      map.projectedCost = key;
    }
    else if (/\(over\)|under|variance|g.*q/.test(lowerKey)) {
      map.variance = key;
    }
  }

  // For any unmapped columns, use best guesses based on position or patterns
  const fallbackMappings = inferColumnMappings(keys);
  
  // Merge the detected mappings with fallbacks for any missed columns
  return { ...fallbackMappings, ..._.pickBy(map, value => value !== '') };
};

/**
 * Infers column mappings based on typical patterns in construction budget spreadsheets
 */
const inferColumnMappings = (keys) => {
  // Implement fallback logic based on common budget CSV structures
  // This would contain heuristics based on column position/patterns
  return {
    costCode: keys.find(k => /code/i.test(k)) || 'Budget Code',
    costCodeDescription: keys.find(k => /descr/i.test(k)) || 'Budget Code Description',
    costType: keys.find(k => /type/i.test(k)) || 'Cost Type',
    currentBudget: keys.find(k => /budget/i.test(k)) || 'E - Current Contract Budget',
    billedToDate: keys.find(k => /billed/i.test(k)) || 'J - Total Billed to Date',
    percentBilled: keys.find(k => /\%.*billed/i.test(k)) || '% Billed to Date',
    projectedCost: keys.find(k => /projected|forecast/i.test(k)) || 'Q - Proj Cost @ Complete (J+P)',
    variance: keys.find(k => /variance|over|under/i.test(k)) || '(Over) / Under Budget (G-Q)'
  };
};

/**
 * Process cost type data (Labor, Material, Subcontract, Other)
 */
const processCostTypeData = (groupedByCostType, columnMap, expectedComplete) => {
  const result = [];
  
  const costTypeMap = {
    'L': 'Labor (L)',
    'M': 'Materials (M)',
    'S': 'Subcontracts (S)',
    'O': 'Other (O)',
    // Add fallbacks for different naming conventions
    'LABOR': 'Labor (L)',
    'MATERIAL': 'Materials (M)',
    'SUBCONTRACT': 'Subcontracts (S)',
    'OTHER': 'Other (O)'
  };
  
  for (const [costType, items] of Object.entries(groupedByCostType)) {
    const normalizedType = costTypeMap[costType] || costType;
    
    const totalBudget = sumField(items, columnMap.currentBudget);
    const totalBilled = sumField(items, columnMap.billedToDate);
    
    if (totalBudget > 0) {
      const percentComplete = (totalBilled / totalBudget) * 100;
      
      result.push({
        name: normalizedType,
        complete: parseFloat(percentComplete.toFixed(2)),
        remaining: parseFloat((100 - percentComplete).toFixed(2)),
        expectedComplete: expectedComplete
      });
    }
  }
  
  return result;
};

/**
 * Process division data for progress visualization
 */
const processDivisionData = (groupedByDivision, columnMap, expectedComplete) => {
  const result = [];
  
  // Define division names mapping (optional - for better labels)
  const divisionNames = {
    'Div 1': 'Div 1 - General',
    'Div 2': 'Div 2 - Site Work',
    'Div 3': 'Div 3 - Concrete',
    'Div 4': 'Div 4 - Masonry',
    'Div 5': 'Div 5 - Metals',
    'Div 6': 'Div 6 - Wood/Plastics',
    'Div 7': 'Div 7 - Thermal/Moisture',
    'Div 8': 'Div 8 - Doors/Windows',
    'Div 9': 'Div 9 - Finishes',
    'Div 10': 'Div 10 - Specialties',
    'Div 11': 'Div 11 - Equipment',
    'Div 12': 'Div 12 - Furnishings',
    'Div 13': 'Div 13 - Special Construction',
    'Div 14': 'Div 14 - Conveying Systems',
    'Div 15': 'Div 15 - Mechanical/Plumbing',
    'Div 16': 'Div 16 - Electrical',
    'Div 17': 'Div 17 - Communications',
    'Div 18': 'Div 18 - Builder\'s Contingency',
    'Div 19': 'Div 19 - Project Reqmts',
    'Div 20': 'Div 20 - Builder\'s Fee',
    'Div 21': 'Div 21 - Fire Suppression',
    'Div 22': 'Div 22 - Plumbing',
    'Div 23': 'Div 23 - HVAC',
    'Div 26': 'Div 26 - Electrical',
    'Div 27': 'Div 27 - Communications',
    'Div 28': 'Div 28 - Electronic Safety'
  };
  
  for (const [division, items] of Object.entries(groupedByDivision)) {
    const divisionName = divisionNames[division] || division;
    
    const totalBudget = sumField(items, columnMap.currentBudget);
    const totalBilled = sumField(items, columnMap.billedToDate);
    
    if (totalBudget > 0) {
      const percentComplete = (totalBilled / totalBudget) * 100;
      
      result.push({
        name: divisionName,
        complete: parseFloat(percentComplete.toFixed(2)),
        expected: expectedComplete,
        variance: parseFloat((percentComplete - expectedComplete).toFixed(2))
      });
    }
  }
  
  // Sort from most complete to least complete
  return _.sortBy(result, item => -item.complete);
};

/**
 * Process top budget items by dollar value
 */
const processTopBudgetItems = (rawBudgetData, columnMap, limit = 5) => {
  // Create sortable array of budget items
  const budgetItems = rawBudgetData.map(row => {
    const budget = parseFloat(row[columnMap.currentBudget]) || 0;
    const billed = parseFloat(row[columnMap.billedToDate]) || 0;
    const projected = parseFloat(row[columnMap.projectedCost]) || budget;
    
    return {
      name: row[columnMap.costCodeDescription] || 'Unnamed Item',
      costCode: row[columnMap.costCode] || '',
      budget: budget,
      billed: billed,
      percentBilled: budget > 0 ? (billed / budget) * 100 : 0,
      projected: projected,
      variance: budget - projected
    };
  });
  
  // Sort by budget amount (descending) and take top items
  return _.sortBy(budgetItems, item => -item.budget).slice(0, limit);
};

/**
 * Sum a field across an array of objects
 */
const sumField = (items, fieldName) => {
  return items.reduce((sum, item) => {
    const value = parseFloat(item[fieldName]) || 0;
    return sum + value;
  }, 0);
};

/**
 * Format currency for display
 */
const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

/**
 * Identify potential red flags in project data
 * @returns {Array} List of key findings and recommendations
 */
export const identifyProjectRedFlags = (normalizedData) => {
  const findings = [];
  const { projectData, costTypeData, divisionData } = normalizedData;
  
  // Schedule variance check
  const scheduleVariance = projectData.percentTimeElapsed - projectData.percentBilled;
  if (scheduleVariance > 5) {
    findings.push({
      title: "Schedule Status",
      description: `Project is ${scheduleVariance.toFixed(1)}% behind schedule (${projectData.percentTimeElapsed.toFixed(1)}% time elapsed vs ${projectData.percentBilled.toFixed(1)}% budget spent)`,
      type: scheduleVariance > 10 ? "danger" : "warning",
      recommendation: "Review schedule and accelerate critical path activities"
    });
  }
  
  // Cost type imbalance check
  costTypeData.forEach(costType => {
    const variance = costType.complete - costType.expectedComplete;
    const significantlyBehind = variance < -15;
    
    if (significantlyBehind) {
      findings.push({
        title: `${costType.name} Progress Concern`,
        description: `${costType.name} only ${costType.complete.toFixed(1)}% complete vs expected ${costType.expectedComplete.toFixed(1)}%`,
        type: "danger",
        recommendation: `Expedite ${costType.name.split(' ')[0]} procurement and activities`
      });
    }
  });
  
  // Division progress check
  divisionData.forEach(division => {
    // Check for divisions significantly behind schedule
    if (division.variance < -20) {
      findings.push({
        title: `${division.name} Behind Schedule`,
        description: `${division.name} only ${division.complete.toFixed(1)}% complete vs expected ${division.expected.toFixed(1)}%`,
        type: "danger",
        recommendation: `Prioritize ${division.name} activities to prevent cascading delays`
      });
    }
  });
  
  // Budget overrun check
  if (projectData.percentOverage > 0) {
    findings.push({
      title: "Budget Concerns",
      description: `Projected overrun of ${projectData.projectedOverage} (${projectData.percentOverage.toFixed(1)}% over budget)`,
      type: projectData.percentOverage > 5 ? "danger" : "warning",
      recommendation: "Review contingency usage and implement cost controls"
    });
  }
  
  return findings;
};

/**
 * Main hook-compatible function to load and transform CSV data
 */
export const transformBudgetCSV = async (filepath, projectMeta) => {
  try {
    // Read file
    const response = await window.fs.readFile(filepath, { encoding: 'utf8' });
    
    // Parse CSV
    const { data } = Papa.parse(response, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true
    });
    
    // Transform data
    return normalizeBudgetData(data, projectMeta);
  } catch (error) {
    console.error("Error transforming budget CSV:", error);
    throw error;
  }
};