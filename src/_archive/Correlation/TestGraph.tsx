import React, { useRef, useEffect } from "react";
import { ForceGraph2D } from "react-force-graph-2d";

const TestGraph: React.FC = () => {
  const fgRef = useRef<any>(null);

  const testData = {
    nodes: [{ id: "A" }, { id: "B" }],
    links: [{ source: "A", target: "B" }]
  };

  useEffect(() => {
    if (fgRef.current) {
      // wait a tick for layout
      setTimeout(() => {
        fgRef.current.zoomToFit(400, 50);
      }, 500);
    }
  }, []);

  return (
    <div style={{ width: "600px", height: "400px", border: "2px solid lime" }}>
      <ForceGraph2D ref={fgRef} graphData={testData} />
    </div>
  );
};

export default TestGraph;
