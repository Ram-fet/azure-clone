import React from "react";
import { Button } from "@fluentui/react-components";
import { ChevronLeft24Filled, ChevronRight24Filled } from "@fluentui/react-icons";

export default function PageControls({ pageNumber, numPages, onPrev, onNext }) {
  return (
    <div className="page-controls">
      <Button
        icon={<ChevronLeft24Filled />}
        disabled={pageNumber <= 1}
        onClick={onPrev}
      >
        Prev
      </Button>

      <span>
        Page {pageNumber} of {numPages || 1}
      </span>

      <Button
        icon={<ChevronRight24Filled />}
        disabled={pageNumber >= numPages}
        onClick={onNext}
      >
        Next
      </Button>
    </div>
  );
}
