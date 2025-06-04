import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler
} from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, Filler);

const OriginalSignalPlot = ({ time, waveformAmplitude }) => {
  const data = {
    labels: time.map(t => t.toFixed(4)),  // Time in seconds rounded to 4 decimals
    datasets: [
      {
        label: "Segnale audio",
        data: waveformAmplitude,
        borderColor: "#9370DB",
        backgroundColor: "rgba(203, 227, 44, 0.2)",
        fill: true,
        pointRadius: 0,
        tension: 0.2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { top: 20, bottom: 40, left: 30, right: 30 },
    },
    plugins: {
      legend: { display: false },
      tooltip: { mode: "index", intersect: false },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: "Tempo (s)",
          color: "#000000",
          font: { size: 14 },
        },
        ticks: {
          color: "#000000",
          font: { size: 12 },
        },
        grid: { color: "rgba(255,255,255,0.1)" },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: "Ampiezza",
          color: "#000000",
          font: { size: 14 },
        },
        ticks: {
          color: "#000000",
          font: { size: 12 },
        },
        grid: { color: "rgba(255,255,255,0.1)" },
      },
    },
  };

  return (
    <div style={{ width: "100%", height: "300px", marginTop: "2rem" }}>
      <h3 style={{ color: "#000000" }}>Segnale Audio (Time Domain)</h3>
      <Line data={data} options={options} />
    </div>
  );
};

export default OriginalSignalPlot;
