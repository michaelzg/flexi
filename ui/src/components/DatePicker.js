import React, { useEffect, useState, useRef } from 'react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';

const DatePicker = ({ onDateChange, initialStartDate, initialEndDate }) => {
  const [activePreset, setActivePreset] = useState(null);
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);
  const startPickerRef = useRef(null);
  const endPickerRef = useRef(null);

  useEffect(() => {
    // Calculate dates based on current date
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    
    const twoDaysFromNow = new Date(now);
    twoDaysFromNow.setDate(now.getDate() + 2);
    
    const fourDaysFromNow = new Date(now);
    fourDaysFromNow.setDate(now.getDate() + 4);
    
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(now.getDate() + 7);

    // Determine which preset matches the initial dates (if any)
    const initialStart = initialStartDate || yesterday.toISOString().split('T')[0];
    const initialEnd = initialEndDate || twoDaysFromNow.toISOString().split('T')[0];
    
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const twoDaysFromNowStr = twoDaysFromNow.toISOString().split('T')[0];
    const fourDaysFromNowStr = fourDaysFromNow.toISOString().split('T')[0];
    const sevenDaysFromNowStr = sevenDaysFromNow.toISOString().split('T')[0];
    
    // Set activePreset based on initial dates
    if (initialStart === yesterdayStr && initialEnd === twoDaysFromNowStr) {
      setActivePreset('2d');
    } else if (initialStart === yesterdayStr && initialEnd === fourDaysFromNowStr) {
      setActivePreset('4d');
    } else if (initialStart === yesterdayStr && initialEnd === sevenDaysFromNowStr) {
      setActivePreset('7d');
    } else {
      setActivePreset(null); // Custom date range
    }

    // Initialize date pickers with initial dates or default to yesterday and 2 days from now
    startPickerRef.current = flatpickr(startDateRef.current, {
      dateFormat: "Y-m-d",
      defaultDate: initialStart
    });
    
    endPickerRef.current = flatpickr(endDateRef.current, {
      dateFormat: "Y-m-d",
      defaultDate: initialEnd,
      minDate: initialStart
    });
  
    // Update end date min date when start date changes
    startPickerRef.current.config.onChange.push(function(selectedDates, dateStr) {
      endPickerRef.current.set("minDate", dateStr);
      // Clear preset when manually changing start date
      setActivePreset(null);
    });

    // Clear preset when manually changing end date
    endPickerRef.current.config.onChange.push(function(selectedDates, dateStr) {
      setActivePreset(null);
    });

    // Cleanup on unmount
    return () => {
      if (startPickerRef.current) startPickerRef.current.destroy();
      if (endPickerRef.current) endPickerRef.current.destroy();
    };
  }, [initialStartDate, initialEndDate]);

  const handleDateChange = () => {
    if (startPickerRef.current && endPickerRef.current) {
      const startDate = startPickerRef.current.selectedDates[0].toISOString().split('T')[0];
      const endDate = endPickerRef.current.selectedDates[0].toISOString().split('T')[0];
      onDateChange(startDate, endDate);
    }
  };

  const handlePresetClick = (preset) => {
    setActivePreset(preset);
    
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    
    let endDate;
    
    if (preset === '2d') {
      endDate = new Date(now);
      endDate.setDate(now.getDate() + 2);
    } else if (preset === '4d') {
      endDate = new Date(now);
      endDate.setDate(now.getDate() + 4);
    } else if (preset === '7d') {
      endDate = new Date(now);
      endDate.setDate(now.getDate() + 7);
    }
    
    startPickerRef.current.setDate(yesterday);
    endPickerRef.current.setDate(endDate);
    
    handleDateChange();
  };

  return (
    <div className="date-picker-container">
      <div className="date-picker-row">
        <div className="date-picker-wrapper">
          <input 
            type="text" 
            ref={startDateRef} 
            className="date-input" 
            placeholder="Start Date" 
          />
        </div>
        <div className="date-picker-wrapper">
          <input 
            type="text" 
            ref={endDateRef} 
            className="date-input" 
            placeholder="End Date" 
          />
        </div>
        <button 
          className="update-button" 
          onClick={handleDateChange}
        >
          Update
        </button>
      </div>
      <div className="preset-buttons">
        <button 
          className={`preset-button ${activePreset === '2d' ? 'active' : ''}`}
          onClick={() => handlePresetClick('2d')}
        >
          2d
        </button>
        <button 
          className={`preset-button ${activePreset === '4d' ? 'active' : ''}`}
          onClick={() => handlePresetClick('4d')}
        >
          4d
        </button>
        <button 
          className={`preset-button ${activePreset === '7d' ? 'active' : ''}`}
          onClick={() => handlePresetClick('7d')}
        >
          7d
        </button>
      </div>
    </div>
  );
};

export default DatePicker;
