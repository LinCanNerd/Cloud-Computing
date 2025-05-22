import { useState, useEffect } from "react";
import {
  Button,
  Heading,
  Flex,
  View,
  Divider,
  SelectField,
} from "@aws-amplify/ui-react";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { Amplify } from "aws-amplify";
import "@aws-amplify/ui-react/styles.css";
import { generateClient } from "aws-amplify/data";
import outputs from "../amplify_outputs.json";
import FFTPlot from "./FFTPlot";
import OriginalSignalPlot from "./OriginalSignalPlot";

Amplify.configure(outputs);
const client = generateClient({ authMode: "userPool" });

export default function App() {
  const [frequencies, setFrequencies] = useState(null);
  const [amplitudes, setAmplitudes] = useState(null);
  const [sampleRate, setSampleRate] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [fullSignal, setFullSignal] = useState(null);
  const [signalSlice, setSignalSlice] = useState(null);
  const [signalStartIndex, setSignalStartIndex] = useState(0);
  const [fftSize, setFftSize] = useState(2048);
  const { signOut } = useAuthenticator((context) => [context.user]);

  async function handleFileChange(event) {
    const file = event.target.files[0];
    if (!file || (!file.name.endsWith(".wav") && file.type !== "audio/wav")) {
      alert("Carica un file WAV valido.");
      return;
    }

    console.log("📂 File selezionato:", file.name);
    setFileName(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      const rawSignal = audioBuffer.getChannelData(0);
      setFullSignal(rawSignal);
      setSampleRate(audioBuffer.sampleRate);
      updateWindow(rawSignal, 0);
    } catch (error) {
      console.error("❌ Errore nella lettura del file WAV:", error);
      alert("Errore nella lettura del file WAV");
    }
  }

  function updateWindow(signal, startIndex) {
    const slice = signal.slice(startIndex, startIndex + fftSize);
    setSignalSlice(slice);
    setSignalStartIndex(startIndex);
    // callFFT is now handled by useEffect
  }

  useEffect(() => {
    if (signalSlice && sampleRate) {
      const nonZero = signalSlice.some((x) => x !== 0);
      if (nonZero) {
        callFFT(signalSlice, sampleRate);
      } else {
        console.warn("⚠️ Segmento silenzioso, FFT saltata.");
        setFrequencies(null);
        setAmplitudes(null);
      }
    }
  }, [signalSlice, fftSize, sampleRate]);

async function callFFT(signal, sampleRate) {
  console.log("🚀 Invio segnale per FFT con sampleRate:", sampleRate);
  console.log("📊 Signal preview:", signal.slice(0, 5));

  try {
    const response = await fetch(
      "https://cocu4sbsg5.execute-api.eu-central-1.amazonaws.com/dev/upload",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signals: [Array.from(signal)] }),  // <-- Fix here
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("❌ Risposta NON OK:", response.status, text);
      return;
    }

    const result = await response.json();
    console.log("✅ FFT Result ricevuto:", result);

    if (result.length > 0) {
      const fft = result[0];
      const freqsHz = fft.frequencies.map((f) => f * sampleRate);
      const amps = fft.amplitudes;

      const maxFreq = 8000;
      const limitIndex = freqsHz.findIndex((f) => f > maxFreq);
      setFrequencies(freqsHz.slice(0, limitIndex));
      setAmplitudes(amps.slice(0, limitIndex));
    } else {
      console.warn("⚠️ Risultato vuoto ricevuto.");
    }
  } catch (error) {
    console.error("❌ Errore durante la chiamata FFT:", error);
  }
}

  function resetAnalysis() {
    setFrequencies(null);
    setAmplitudes(null);
    setFileName(null);
    setFullSignal(null);
    setSignalSlice(null);
    setSignalStartIndex(0);
    console.log("🔄 Analisi FFT resettata.");
  }

  const maxIndex = fullSignal ? fullSignal.length - fftSize : 0;

  return (
    <Flex
      className="App"
      justifyContent="center"
      alignItems="center"
      direction="column"
      width="90%"
      margin="0 auto"
      style={{ color: "#000000" }}
    >
      <Heading level={1}>Analisi Audio FFT</Heading>
      <Divider />

      <input
        key={fileName || "fileinput"}
        type="file"
        accept=".wav"
        onChange={handleFileChange}
        style={{ marginBottom: "1rem" }}
      />

      <SelectField
        label="Numero di campioni FFT"
        value={fftSize}
        onChange={(e) => setFftSize(Number(e.target.value))}
        style={{ marginBottom: "1rem", width: "300px", color: "black" }}
      >
        <option value={512}>512</option>
        <option value={1024}>1024</option>
        <option value={2048}>2048</option>
        <option value={4096}>4096</option>
        <option value={8192}>8192</option>
      </SelectField>

      {fileName && <p><strong>📂 File caricato:</strong> {fileName}</p>}

      {fullSignal && (
        <>
          <label htmlFor="windowSlider">🕒 Finestra temporale (secondi):</label>
          <input
            id="windowSlider"
            type="range"
            min={0}
            max={maxIndex}
            step={fftSize}
            value={signalStartIndex}
            onChange={(e) =>
              updateWindow(fullSignal, Number(e.target.value))
            }
            style={{ width: "100%", marginBottom: "1rem" }}
          />
        </>
      )}

      {signalSlice && sampleRate && (
        <OriginalSignalPlot
          signal={signalSlice}
          sampleRate={sampleRate}
          startIndex={signalStartIndex}
        />
      )}

      {frequencies && amplitudes && sampleRate && (
        <FFTPlot
          frequencies={frequencies}
          amplitudes={amplitudes}
          sampleRate={sampleRate}
          onReset={resetAnalysis}
        />
      )}

      <Button onClick={signOut} style={{ marginTop: "15rem" }}>
        Sign Out
      </Button>
    </Flex>
  );
}
