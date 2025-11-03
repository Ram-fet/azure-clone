import React from "react";
import { Button } from "@fluentui/react-components";
import { Play24Filled, Eye24Filled, EyeOff24Filled, DarkTheme24Filled, PanelRightContract24Filled } from "@fluentui/react-icons";

export default function TopBar({ onRun, onOpenOptions, darkMode, toggleDarkMode, showBoxes, toggleBoxes , onOpenHtml,         }) {
  return (
    <div className="top-bar">
      <h3 className="logo">Azure AI Clone</h3>
      <div className="topbar-buttons">
        <Button appearance="primary" icon={<Play24Filled />} onClick={onRun}>
          Run analysis
        </Button>
        <Button icon={<PanelRightContract24Filled />} onClick={onOpenOptions}>
          Analyze options
        </Button>
        <Button icon={showBoxes ? <EyeOff24Filled /> : <Eye24Filled />} onClick={toggleBoxes}>
          {showBoxes ? "Hide Boxes" : "Show Boxes"}
        </Button>
        <Button icon={<DarkTheme24Filled />} onClick={toggleDarkMode}>
          {darkMode ? "Light" : "Dark"}
        </Button>
              <button onClick={onOpenHtml}>View as HTML</button>
      </div>
    </div>
  );
}
