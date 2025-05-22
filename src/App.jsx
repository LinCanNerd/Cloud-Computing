import { useState, useEffect } from "react";
import {
  Button,
  Heading,
  Flex,
  Divider,
  SelectField,
} from "@aws-amplify/ui-react";
import { Amplify } from "aws-amplify";
import "@aws-amplify/ui-react/styles.css";
import outputs from "../amplify_outputs.json";
import FFTPlot from "./FFTPlot";
import OriginalSignalPlot from "./OriginalSignalPlot";

Amplify.configure(outputs);

export default function App() {
  const [frequencies, setFrequencies] = useState(null);
  const [amplitudes, setAmplitudes] = useState(null);
  const [sampleRate, setSampleRate] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [fullSignal, setFullSignal] = useState(null);
  const [signalSlice, setSignalSlice] = useState(null);
  const [fftSize, setFftSize] = useState(2048);

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
      const slice = rawSignal.slice(0, fftSize);
      setSignalSlice(slice);
    } catch (error) {
      console.error("❌ Errore nella lettura del file WAV:", error);
      alert("Errore nella lettura del file WAV");
    }
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

    try {
      const response = await fetch(
        "https://cocu4sbsg5.execute-api.eu-central-1.amazonaws.com/dev/upload",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signals: [Array.from(signal)] }),
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
    console.log("🔄 Analisi FFT resettata.");
  }

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

      {signalSlice && sampleRate && (
        <OriginalSignalPlot
          signal={signalSlice}
          sampleRate={sampleRate}
          startIndex={0}
        />
      )}

      {frequencies && amplitudes && sampleRate && (
        <>
          <FFTPlot
            frequencies={frequencies}
            amplitudes={amplitudes}
            sampleRate={sampleRate}
          />
        </>
      )}
    </Flex>
  );
}
