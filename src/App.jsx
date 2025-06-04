import React, { useState, useEffect, useRef } from "react";
import OriginalSignalPlot from "./OriginalSignalPlot";
import FFTPlot from "./FFTPlot";

const App = () => {
  const [frequencies, setFrequencies] = useState(null);
  const [amplitudes, setAmplitudes] = useState(null);
  const [time, setTime] = useState(null);
  const [waveformAmplitude, setWaveformAmplitude] = useState(null);
  const [originalSampleRate, setOriginalSampleRate] = useState(null);
  const [sampleRate, setSampleRate] = useState(44100);
  const [originalBuffer, setOriginalBuffer] = useState(null);
  const [fullSignal, setFullSignal] = useState(null);
  const [isReady, setIsReady] = useState(false);

  const fileInputRef = useRef(null);

  const resampleAudioBuffer = async (audioBuffer, targetRate) => {
    if (audioBuffer.sampleRate === targetRate) return audioBuffer;

    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      Math.ceil(audioBuffer.duration * targetRate),
      targetRate
    );

    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start(0);

    return await offlineContext.startRendering();
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    try {
      const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);

      setOriginalSampleRate(decodedBuffer.sampleRate);
      setOriginalBuffer(decodedBuffer);

      const targetSampleRate = sampleRate || decodedBuffer.sampleRate;
      const resampledBuffer = await resampleAudioBuffer(decodedBuffer, targetSampleRate);
      const pcmData = Array.from(resampledBuffer.getChannelData(0));

      setFullSignal(pcmData);
      callFFT(pcmData, decodedBuffer.sampleRate, targetSampleRate);
    } catch (error) {
      console.error("Error decoding or resampling audio file:", error);
    }
  };

  const callFFT = async (signal, originalRate, targetRate) => {
    try {
      const response = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signal,
          originalSampleRate: originalRate,
          sampleRate: targetRate,
        }),
      });

      const result = await response.json();

      if (
        result.frequencies &&
        result.amplitudes &&
        result.time &&
        result.waveformAmplitude
      ) {
        setFrequencies(result.frequencies);
        setAmplitudes(result.amplitudes);
        setTime(result.time);
        setWaveformAmplitude(result.waveformAmplitude);
        setIsReady(true);
      } else {
        console.warn("Incomplete response from backend");
      }
    } catch (error) {
      console.error("FFT error:", error);
    }
  };

  useEffect(() => {
    const resampleAndCallAPI = async () => {
      if (originalBuffer && originalSampleRate && sampleRate) {
        const resampledBuffer = await resampleAudioBuffer(originalBuffer, sampleRate);
        const pcmData = Array.from(resampledBuffer.getChannelData(0));
        setFullSignal(pcmData);
        callFFT(pcmData, originalSampleRate, sampleRate);
      }
    };

    resampleAndCallAPI();
  }, [sampleRate]);

  const handleRefresh = () => {
    setFrequencies(null);
    setAmplitudes(null);
    setTime(null);
    setWaveformAmplitude(null);
    setOriginalSampleRate(null);
    setOriginalBuffer(null);
    setFullSignal(null);
    setIsReady(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Clear the file input
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>🎵 Audio Analyzer</h2>

      <div style={{ marginBottom: "1rem" }}>
        <label>
          Select Sample Rate:
          <select
            value={sampleRate}
            onChange={(e) => setSampleRate(Number(e.target.value))}
            style={{ marginLeft: "0.5rem" }}
          >
            <option value={8000}>8000 Hz</option>
            <option value={16000}>16000 Hz</option>
            <option value={22050}>22050 Hz</option>
            <option value={44100}>44100 Hz</option>
            <option value={48000}>48000 Hz</option>
          </select>
        </label>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label>
          Upload Audio File:
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            style={{ marginLeft: "0.5rem" }}
          />
        </label>
      </div>

      {sampleRate && (
        <div style={{ marginBottom: "1rem" }}>
          <strong>Current Sample Rate:</strong> {sampleRate} Hz
        </div>
      )}

      {isReady && time && waveformAmplitude && (
        <OriginalSignalPlot time={time} waveformAmplitude={waveformAmplitude} />
      )}

      {isReady && frequencies && amplitudes && (
        <FFTPlot frequencies={frequencies} amplitudes={amplitudes} />
      )}

      {isReady && (
        <div style={{ marginTop: "2rem" }}>
          <button
            onClick={handleRefresh}
            style={{ padding: "0.5rem 1rem", cursor: "pointer", borderRadius: "12px", backgroundColor: "white", border: "1px solid black"  }}
          >
            🔄 Refresh
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
