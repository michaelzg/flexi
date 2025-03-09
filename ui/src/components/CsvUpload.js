import React, { useState } from 'react';

const CsvUpload = ({ onDataParsed, label = "Upload Usage Data (CSV)" }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const csvData = e.target.result;
        const parsedData = parseCSV(csvData);
        onDataParsed(parsedData);
        setIsUploading(false);
        // Reset the file input
        event.target.value = null;
      } catch (err) {
        setError('Error parsing CSV file: ' + err.message);
        setIsUploading(false);
      }
    };

    reader.onerror = () => {
      setError('Error reading file');
      setIsUploading(false);
    };

    reader.readAsText(file);
  };

  const parseCSV = (csvText) => {
    // Split by lines and remove empty lines
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    
    // Check if we have at least a header and one data row
    if (lines.length < 2) {
      throw new Error('CSV file must contain a header row and at least one data row');
    }

    // Get header to check format
    const header = lines[0].toLowerCase();
    
    // Skip header (first line)
    const dataLines = lines.slice(1);
    
    // Check if this is the historical usage format
    const isHistoricalFormat = header.includes('type') && 
                              header.includes('date') && 
                              header.includes('start time') && 
                              header.includes('usage (kwh)') && 
                              header.includes('cost');
    
    // Parse each line
    const parsedData = dataLines.map(line => {
      const columns = line.split(',');
      
      // Ensure we have the expected number of columns
      if (columns.length < 6) {
        throw new Error(`Invalid CSV format in line: ${line}`);
      }

      if (isHistoricalFormat) {
        // Historical usage format
        // TYPE,DATE,START TIME,END TIME,USAGE (kWh),COST,NOTES
        const date = columns[1].trim();
        const startTime = columns[2].trim();
        
        // Create timestamp
        const timestamp = `${date}T${startTime}:00`;
        
        // Extract usage and cost
        const usage = parseFloat(columns[4].trim());
        
        // Remove $ from cost and convert to float
        const costStr = columns[5].trim();
        const cost = parseFloat(costStr.replace('$', ''));

        return {
          timestamp,
          usage,
          cost,
          isHistorical: true
        };
      } else {
        // Original format
        const date = columns[1].trim();
        const startTime = columns[2].trim();
        
        // Create timestamp
        const timestamp = `${date}T${startTime}:00`;
        
        // Extract usage and cost
        const usage = parseFloat(columns[4].trim());
        
        // Remove $ from cost and convert to float
        const costStr = columns[5].trim();
        const cost = parseFloat(costStr.replace('$', ''));

        return {
          timestamp,
          usage,
          cost,
          isHistorical: false
        };
      }
    });

    return parsedData;
  };

  return (
    <div className="csv-upload-container">
      <div className="csv-upload-wrapper">
        <label className="csv-upload-label">
          {label}
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleFileChange}
            className="csv-upload-input"
          />
        </label>
        <div 
          className="csv-upload-info-icon" 
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          i
        </div>
        {showTooltip && (
          <div className="csv-upload-tooltip">
            Upload historical usage data from 1 year ago to compare with current pricing. 
            This helps calculate PG&E subscription cost credits based on your historical usage patterns.
          </div>
        )}
      </div>
      {isUploading && <div className="csv-upload-loading">Uploading...</div>}
      {error && <div className="csv-upload-error">{error}</div>}
    </div>
  );
};

export default CsvUpload;
