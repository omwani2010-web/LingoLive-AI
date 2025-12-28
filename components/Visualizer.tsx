
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface VisualizerProps {
  isActive: boolean;
  isModelSpeaking: boolean;
  isUserSpeaking: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ isActive, isModelSpeaking, isUserSpeaking }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 300;
    const height = 150;
    const barCount = 30;
    const barWidth = width / barCount - 2;

    const g = svg.append("g")
      .attr("transform", `translate(0, ${height / 2})`);

    const bars = g.selectAll("rect")
      .data(d3.range(barCount))
      .enter()
      .append("rect")
      .attr("x", (d) => d * (barWidth + 2))
      .attr("width", barWidth)
      .attr("height", 4)
      .attr("rx", 2)
      .attr("fill", "#94a3b8");

    let animationFrame: number;

    const animate = () => {
      bars.transition()
        .duration(150)
        .attr("height", () => {
          if (!isActive) return 4;
          const active = isModelSpeaking || isUserSpeaking;
          if (!active) return 4 + Math.random() * 4;
          return 10 + Math.random() * (height - 20);
        })
        .attr("y", function() {
          const h = parseFloat(d3.select(this).attr("height"));
          return -h / 2;
        })
        .attr("fill", () => {
          if (isModelSpeaking) return "#818cf8";
          if (isUserSpeaking) return "#34d399";
          return "#94a3b8";
        });

      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animationFrame);
  }, [isActive, isModelSpeaking, isUserSpeaking]);

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <svg ref={svgRef} width="300" height="150" className="rounded-xl bg-slate-100/50" />
      <div className="flex space-x-6 text-xs font-medium uppercase tracking-wider text-slate-500">
        <div className="flex items-center">
          <span className={`w-3 h-3 rounded-full mr-2 ${isUserSpeaking ? 'bg-emerald-400 animate-pulse' : 'bg-slate-300'}`}></span>
          You
        </div>
        <div className="flex items-center">
          <span className={`w-3 h-3 rounded-full mr-2 ${isModelSpeaking ? 'bg-indigo-400 animate-pulse' : 'bg-slate-300'}`}></span>
          Tutor
        </div>
      </div>
    </div>
  );
};

export default Visualizer;
