import React, { useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler     // ⬅️ AGGIUNGI QUESTO
} from "chart.js";
import { Button } from "@aws-amplify/ui-react";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler      // ⬅️ REGISTRA QUESTO
);


const FFTPlot = ({ frequencies, amplitudes, sampleRate, onReset }) => {
  const peakFreq = useMemo(() => {
    if (!amplitudes || amplitudes.length === 0) return null;
    const maxIndex = amplitudes.reduce((iMax, val, i, arr) => val > arr[iMax] ? i : iMax, 0);
    return frequencies[maxIndex];
  }, [frequencies, amplitudes]);

  const data = {
    labels: frequencies.map(f => f.toFixed(2)),
    datasets: [
      {
        label: "Ampiezze (log10)",
        data: amplitudes.map((a) => Math.log10(a + 1e-12)),
        borderColor: "#00B5AD",
        backgroundColor: "rgba(0,181,173,0.2)",
        fill: true,
        pointRadius: 0,
        tension: 0.2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: "index", intersect: false },
    },
    scales: {
      x: {
        title: { display: true, text: "Frequenza (Hz)" },
        ticks: { autoSkip: true, maxTicksLimit: 20 },
      },
      y: {
        title: { display: true, text: "Ampiezza (log)" },
        beginAtZero: true,
      },
    },
  };

  return (
    <div style={{ width: "100%", height: "300px", marginTop: "2rem" }}>
      <h3>Spettro delle Frequenze (FFT)</h3>
      <Line data={data} options={options} />
      {peakFreq && (
        <p style={{ marginTop: "1rem" }}>
          🎯 <strong>Frequenza dominante:</strong> {peakFreq.toFixed(2)} Hz
        </p>
      )}
      <Button onClick={onReset} style={{ marginTop: "1rem" }}>
        Elimina output
      </Button>
    </div>
  );
};

export default FFTPlot;