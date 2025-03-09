import moment from 'moment';

// Function to generate day background annotations
export const generateDayBackgrounds = (timestamps) => {
  if (!timestamps || timestamps.length === 0) return {};
  
  const dayBackgrounds = {};
  const days = {};
  
  // Group timestamps by day
  timestamps.forEach(timestamp => {
    const date = moment(timestamp).format('YYYY-MM-DD');
    if (!days[date]) {
      days[date] = {
        date: date,
        dayOfWeek: moment(timestamp).format('dddd'),
        timestamps: []
      };
    }
    days[date].timestamps.push(timestamp);
  });
  
  // Create background annotation for each day
  Object.values(days).forEach((day, index) => {
    if (day.timestamps.length > 0) {
      // Sort timestamps for this day
      const sortedTimestamps = [...day.timestamps].sort();
      
      // Get first and last timestamp for the day
      const firstTimestamp = sortedTimestamps[0];
      // For the end time, use the start of the next day or a bit after the last timestamp
      const lastTimestamp = moment(sortedTimestamps[sortedTimestamps.length - 1])
        .add(1, 'hour').toISOString(); // Add an hour to ensure coverage
      
      dayBackgrounds[`day_${index}`] = {
        type: 'box',
        xMin: firstTimestamp,
        xMax: lastTimestamp,
        yMin: 'min',
        yMax: 'max',
        backgroundColor: 'rgba(200, 200, 200, 0.2)', // Subtle gray background
        borderWidth: 0,
        label: {
          display: true,
          content: day.dayOfWeek,
          position: 'start',
          font: {
            family: "'Inter', sans-serif",
            size: 12,
            weight: 'bold'
          },
          color: 'rgba(100, 100, 100, 0.7)', // Subtle text color
          padding: {
            top: 4,
            bottom: 4
          }
        }
      };
    }
  });
  
  return dayBackgrounds;
};

// Custom tooltip handler for Chart.js
export const externalTooltipHandler = (tooltipEl) => (context) => {
  // Hide if no tooltip
  const {chart, tooltip} = context;
  if (tooltip.opacity === 0) {
    tooltipEl.style.opacity = 0;
    return;
  }

  // Set Text
  if (tooltip.body) {
    const dataPoint = chart.data.datasets[0].data[tooltip.dataPoints[0].dataIndex];
    const label = chart.data.labels[tooltip.dataPoints[0].dataIndex];
    const formattedDate = moment(label).format('MMM D, YYYY');
    const formattedTime = moment(label).format('h:mm A');
    const isNegative = dataPoint < 0;
    
    const titleLines = [`${formattedDate}`];
    const valueClass = isNegative ? 'negative-value' : 'positive-value';
    
    tooltipEl.innerHTML = `
      <div class="tooltip-title">${titleLines}</div>
      <div class="tooltip-value ${valueClass}">${(dataPoint * 100).toFixed(2)} ¢/kWh</div>
      <div class="tooltip-time">${formattedTime}</div>
    `;
  }

  // Position tooltip and show
  const {offsetLeft: positionX, offsetTop: positionY} = chart.canvas;
  tooltipEl.style.opacity = 1;
  tooltipEl.style.left = positionX + tooltip.caretX + 'px';
  tooltipEl.style.top = positionY + tooltip.caretY + 'px';
};

// Function to format date as YYYYMMDD for API
export const formatDateForAPI = (dateString) => {
  return dateString.replace(/-/g, '');
};
