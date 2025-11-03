import React from "react";
import { Button } from "@fluentui/react-components";
import { ZoomIn24Filled, ZoomOut24Filled } from "@fluentui/react-icons";

export default function ZoomControls({ scale, setScale }) {
  return (
    <div className="zoom-controls">
      <Button
        icon={<ZoomOut24Filled />}
        onClick={() => setScale(scale - 0.1)}
      />
      <span>{Math.round(scale * 100)}%</span>
      <Button
        icon={<ZoomIn24Filled />}
        onClick={() => setScale(scale + 0.1)}
      />
    </div>
  );
}
