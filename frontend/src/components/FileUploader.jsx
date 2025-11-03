import React from "react";

function FileUploader({ onUpload }) {
  return (
    <div className="file-uploader">
      <input
        type="file"
        // PDF + common images
        accept="application/pdf,image/*"
        onChange={onUpload}
      />
    </div>
  );
}

export default FileUploader;
