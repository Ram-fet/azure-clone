import React from "react";

function SidebarLeft({ onFileUpload, files, onSelectFile, activeFile }) {
  return (
    <div className="sidebar-left">
      <h4>Files</h4>
      <input
        type="file"
        accept="application/pdf,image/*"
        onChange={onFileUpload}
        style={{ marginBottom: "10px" }}
      />

      <div className="file-thumbnails">
        {files.length > 0 ? (
          files.map((file, idx) => (
            <div
              key={idx}
              className={`file-thumb ${activeFile === idx ? "active" : ""}`}
              onClick={() => onSelectFile(idx)}
            >
              {file.name}
            </div>
          ))
        ) : (
          <p style={{ fontSize: "12px", color: "#666" }}>No files uploaded</p>
        )}
      </div>
    </div>
  );
}

export default SidebarLeft;
