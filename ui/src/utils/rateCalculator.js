// Rate calculator for TOU (Time of Use) electricity rates and savings calculations

// Standard Time-of-Use Rates
const TOU_RATES = {
  summer: {
    startMonth: 6, // June
    endMonth: 9,   // September
    rates: {
      peak: 0.62277,        // 4-9 PM
      partialPeak: 0.51228, // 3-4 PM and 9 PM-midnight
      offPeak: 0.31026      // all other hours
    }
  },
  winter: {
    startMonth: 10, // October (wraps to May)
    endMonth: 5,    // May
    rates: {
      peak: 0.49566,        // 4-9 PM
      partialPeak: 0.47896, // 3-4 PM and 9 PM-midnight
      offPeak: 0.31027      // all other hours
    }
  }
};

// Determine if a date is in summer or winter rate period
export const getSeason = (date) => {
  const month = date.getMonth() + 1; // getMonth() returns 0-11, we need 1-12
  
  // Summer: June (6) through September (9)
  if (month >= TOU_RATES.summer.startMonth && month <= TOU_RATES.summer.endMonth) {
    return 'summer';
  }
  
  // Winter: October (10) through May (5) of next year
  return 'winter';
};

// Determine the time-of-use period for a given hour
export const getTOUPeriod = (hour) => {
  // Peak: 4-9 PM (16:00-20:59)
  if (hour >= 16 && hour <= 20) {
    return 'peak';
  }
  
  // Partial-Peak: 3-4 PM (15:00-15:59) and 9 PM-midnight (21:00-23:59)
  if (hour === 15 || (hour >= 21 && hour <= 23)) {
    return 'partialPeak';
  }
  
  // Off-Peak: all other hours (0:00-14:59)
  return 'offPeak';
};

// Get the TOU rate for a specific timestamp
export const getTOURate = (timestamp) => {
  const date = new Date(timestamp);
  const hour = date.getHours();
  const season = getSeason(date);
  const period = getTOUPeriod(hour);
  
  return TOU_RATES[season].rates[period];
};

// Calculate standard TOU cost for usage at a specific timestamp
export const calculateTOUCost = (timestamp, usageKWh) => {
  const rate = getTOURate(timestamp);
  return usageKWh * rate;
};

// Calculate subscription quantities from historical usage data
export const calculateSubscriptionQuantities = (historicalUsageData) => {
  const subscriptionQuantities = {};
  
  // Group usage data by hour and day type (weekday/weekend)
  const groupedData = {};
  
  historicalUsageData.forEach(dataPoint => {
    const date = new Date(dataPoint.timestamp);
    const hour = date.getHours();
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const dayType = isWeekend ? 'weekend' : 'weekday';
    
    const key = `${hour}-${dayType}`;
    
    if (!groupedData[key]) {
      groupedData[key] = [];
    }
    
    groupedData[key].push(dataPoint.usage);
  });
  
  // Calculate average usage for each hour/day type combination
  Object.keys(groupedData).forEach(key => {
    const [hour, dayType] = key.split('-');
    const usageValues = groupedData[key];
    const averageUsage = usageValues.reduce((sum, usage) => sum + usage, 0) / usageValues.length;
    
    if (!subscriptionQuantities[parseInt(hour)]) {
      subscriptionQuantities[parseInt(hour)] = {};
    }
    
    subscriptionQuantities[parseInt(hour)][dayType] = averageUsage;
  });
  
  return subscriptionQuantities;
};

// Get subscription quantity for a specific timestamp
export const getSubscriptionQuantity = (timestamp, subscriptionQuantities) => {
  const date = new Date(timestamp);
  const hour = date.getHours();
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const dayType = isWeekend ? 'weekend' : 'weekday';
  
  if (subscriptionQuantities[hour] && subscriptionQuantities[hour][dayType] !== undefined) {
    return subscriptionQuantities[hour][dayType];
  }
  
  // Fallback: try to find any subscription quantity for this hour
  if (subscriptionQuantities[hour]) {
    const availableDayTypes = Object.keys(subscriptionQuantities[hour]);
    if (availableDayTypes.length > 0) {
      return subscriptionQuantities[hour][availableDayTypes[0]];
    }
  }
  
  // Final fallback: return 0
  return 0;
};

// Calculate dynamic pricing cost/credit
export const calculateDynamicCost = (timestamp, usageKWh, dynamicRate, subscriptionQuantities) => {
  const subscriptionQuantity = getSubscriptionQuantity(timestamp, subscriptionQuantities);
  const usageDifference = usageKWh - subscriptionQuantity;
  
  // If usage is above subscription, charge for the difference
  // If usage is below subscription, credit for the difference
  return usageDifference * dynamicRate;
};

// Calculate savings for a single time period
export const calculateSavings = (timestamp, usageKWh, dynamicRate, subscriptionQuantities) => {
  const touCost = calculateTOUCost(timestamp, usageKWh);
  const dynamicCost = calculateDynamicCost(timestamp, usageKWh, dynamicRate, subscriptionQuantities);
  const savings = touCost - dynamicCost;
  
  return {
    timestamp,
    usageKWh,
    touCost,
    dynamicCost,
    savings,
    touRate: getTOURate(timestamp),
    dynamicRate,
    subscriptionQuantity: getSubscriptionQuantity(timestamp, subscriptionQuantities)
  };
};

// Helper function to normalize timestamps for comparison
const normalizeTimestamp = (timestamp) => {
  // Convert to Date object and then to ISO string without timezone
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hour}:${minute}:00`;
};

// Helper function to create pattern-based key for timestamp matching
const createTimePattern = (timestamp) => {
  const date = new Date(timestamp);
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const hour = date.getHours();
  const minute = date.getMinutes();
  
  return `${dayOfWeek}-${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

// Calculate savings for multiple time periods
export const calculateSavingsForPeriods = (usageData, pricingData, subscriptionQuantities) => {
  const results = [];
  let cumulativeSavings = 0;
  
  console.log("calculateSavingsForPeriods called with:", {
    usageDataCount: usageData.length,
    pricingDataCount: pricingData.timestamps.length,
    subscriptionHours: Object.keys(subscriptionQuantities).length
  });
  
  // Create maps for both exact timestamp matching and pattern matching
  const pricingMap = {};
  const pricingPatternMap = {};
  
  pricingData.timestamps.forEach((timestamp, index) => {
    const normalizedTimestamp = normalizeTimestamp(timestamp);
    const timePattern = createTimePattern(timestamp);
    
    pricingMap[normalizedTimestamp] = {
      price: pricingData.prices[index],
      originalTimestamp: timestamp
    };
    
    // For pattern matching, use the most recent price for each time pattern
    pricingPatternMap[timePattern] = {
      price: pricingData.prices[index],
      originalTimestamp: timestamp
    };
  });
  
  console.log("Sample pricing timestamps:", pricingData.timestamps.slice(0, 3));
  console.log("Sample normalized pricing timestamps:", pricingData.timestamps.slice(0, 3).map(normalizeTimestamp));
  console.log("Sample usage timestamps:", usageData.slice(0, 3).map(d => d.timestamp));
  console.log("Sample normalized usage timestamps:", usageData.slice(0, 3).map(d => normalizeTimestamp(d.timestamp)));
  
  let exactMatchedCount = 0;
  let patternMatchedCount = 0;
  let unmatchedCount = 0;
  
  usageData.forEach(dataPoint => {
    const { timestamp, usage } = dataPoint;
    const normalizedTimestamp = normalizeTimestamp(timestamp);
    const timePattern = createTimePattern(timestamp);
    
    // Try exact timestamp match first
    let pricingInfo = pricingMap[normalizedTimestamp];
    let matchType = 'exact';
    
    // If no exact match, try pattern matching
    if (pricingInfo === undefined) {
      pricingInfo = pricingPatternMap[timePattern];
      matchType = 'pattern';
    }
    
    if (pricingInfo !== undefined) {
      if (matchType === 'exact') {
        exactMatchedCount++;
      } else {
        patternMatchedCount++;
      }
      
      const savingsData = calculateSavings(timestamp, usage, pricingInfo.price, subscriptionQuantities);
      cumulativeSavings += savingsData.savings;
      
      results.push({
        ...savingsData,
        cumulativeSavings
      });
    } else {
      unmatchedCount++;
      if (unmatchedCount <= 3) {
        console.log("No price data found for normalized timestamp:", normalizedTimestamp, "or pattern:", timePattern, "(original:", timestamp, ")");
      }
    }
  });
  
  console.log("Timestamp matching results:", {
    exactMatched: exactMatchedCount,
    patternMatched: patternMatchedCount,
    totalMatched: exactMatchedCount + patternMatchedCount,
    unmatched: unmatchedCount,
    totalResults: results.length
  });
  
  return results;
};

// Helper function to format currency
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Helper function to format energy usage
export const formatUsage = (kWh) => {
  return `${kWh.toFixed(2)} kWh`;
};

// Helper function to get period description
export const getPeriodDescription = (timestamp) => {
  const date = new Date(timestamp);
  const hour = date.getHours();
  const season = getSeason(date);
  const period = getTOUPeriod(hour);
  
  const periodNames = {
    peak: 'Peak',
    partialPeak: 'Partial-Peak',
    offPeak: 'Off-Peak'
  };
  
  const seasonNames = {
    summer: 'Summer',
    winter: 'Winter'
  };
  
  return `${seasonNames[season]} ${periodNames[period]}`;
};