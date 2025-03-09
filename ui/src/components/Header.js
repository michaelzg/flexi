import React from 'react';
import DatePicker from './DatePicker';
import CsvUpload from './CsvUpload';

const Header = ({ dateRange, onDateChange, onHistoricalDataParsed }) => {
  return (
    <header className="header">
      <div className="header-content">
        <div className="header-title">
          <h1>Flexi</h1>
          <div className="header-subtitle">PG&E Flex Pricing</div>
        </div>
        
        <div className="header-controls">
          <DatePicker 
            onDateChange={onDateChange}
            initialStartDate={dateRange.startDate}
            initialEndDate={dateRange.endDate}
          />
          <CsvUpload 
            onDataParsed={onHistoricalDataParsed} 
            label="Upload Usage CSV"
          />
        </div>
        
        <div className="header-metadata">
          <div className="header-metadata-item">
            <span className="header-metadata-label">Utility</span>
            <span className="header-metadata-value">PGE</span>
          </div>
          <div className="header-metadata-item">
            <span className="header-metadata-label">Market</span>
            <span className="header-metadata-value">DAM</span>
          </div>
          <div className="header-metadata-item">
            <span className="header-metadata-label">Rate</span>
            <span className="header-metadata-value">EV2A</span>
          </div>
          <div className="header-metadata-item">
            <span className="header-metadata-label">Circuit</span>
            <span className="header-metadata-value">013921103</span>
          </div>
          <div className="header-metadata-item">
            <span className="header-metadata-label">Program</span>
            <span className="header-metadata-value">CalFUSE</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
