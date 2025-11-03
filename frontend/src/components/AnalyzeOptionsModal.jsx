import React, { useState } from "react";

export default function AnalyzeOptionsModal({ isOpen, onClose, onSave }) {
  const [options, setOptions] = useState({
    analysisRange: "current",
    pageRange: "all",
    barcodes: false,
    language: false,
    highRes: false,
    styleFont: false,
    formulas: false,
    layout: "paragraph", // word / line / paragraph
    searchText: "",      // search inside PDF
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setOptions((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = () => {
    onSave(options);
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Analyze options</h3>

        {/* Run analysis range */}
        <div>
          <h4>Run analysis range</h4>
          <label>
            <input
              type="radio"
              name="analysisRange"
              value="current"
              checked={options.analysisRange === "current"}
              onChange={handleChange}
            />
            Current document
          </label>
          <label>
            <input
              type="radio"
              name="analysisRange"
              value="all"
              checked={options.analysisRange === "all"}
              onChange={handleChange}
            />
            All documents
          </label>
        </div>

        {/* Page range */}
        <div>
          <h4>Page range</h4>
          <label>
            <input
              type="radio"
              name="pageRange"
              value="all"
              checked={options.pageRange === "all"}
              onChange={handleChange}
            />
            All pages
          </label>
          <label>
            <input
              type="radio"
              name="pageRange"
              value="range"
              checked={options.pageRange === "range"}
              onChange={handleChange}
            />
            Range
          </label>
        </div>

        {/* Search inside PDF */}
        <div>
          <h4>Search inside PDF</h4>
          <input
            type="text"
            name="searchText"
            placeholder="Type a word (e.g., school)"
            value={options.searchText}
            onChange={handleChange}
            style={{ width: "100%", padding: "6px", marginTop: "6px" }}
          />
        </div>

        {/* OCR Layout */}
        <div>
          <h4>OCR Layout</h4>
          <select
            name="layout"
            value={options.layout}
            onChange={handleChange}
            style={{ width: "100%", padding: "6px", marginTop: "6px" }}
          >
            <option value="word">Word</option>
            <option value="line">Line</option>
            <option value="paragraph">Paragraph</option>
          </select>
        </div>

        {/* Optional detection */}
        <div>
          <h4>Optional detection</h4>
          <label>
            <input
              type="checkbox"
              name="barcodes"
              checked={options.barcodes}
              onChange={handleChange}
            />
            Barcodes
          </label>
          <label>
            <input
              type="checkbox"
              name="language"
              checked={options.language}
              onChange={handleChange}
            />
            Language
          </label>
        </div>

        {/* Premium detection */}
        <div>
          <h4>Premium detection</h4>
          <label>
            <input
              type="checkbox"
              name="highRes"
              checked={options.highRes}
              onChange={handleChange}
            />
            High resolution
          </label>
          <label>
            <input
              type="checkbox"
              name="styleFont"
              checked={options.styleFont}
              onChange={handleChange}
            />
            Style font
          </label>
          <label>
            <input
              type="checkbox"
              name="formulas"
              checked={options.formulas}
              onChange={handleChange}
            />
            Formulas
          </label>
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <button onClick={handleSave}>Save</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
