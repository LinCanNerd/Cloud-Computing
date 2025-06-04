import json
import numpy as np
from scipy.fft import fft
from scipy.signal import resample

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
    "Access-Control-Allow-Headers": "Content-Type"
}

def lambda_handler(event, context):
    try:
        if event.get("httpMethod") == "OPTIONS":
            return {
                "statusCode": 200,
                "headers": CORS_HEADERS,
                "body": json.dumps({"message": "Preflight OK"})
            }

        body = json.loads(event.get("body", "{}"))
        raw_signal = body.get("signal")
        original_sample_rate = body.get("originalSampleRate")  #. Not needed in code as sample rate is taken from user
        target_sample_rate = body.get("sampleRate")

        if raw_signal is None or len(raw_signal) == 0:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"error": "Missing or empty 'signal' field"})
            }

        if original_sample_rate is None or target_sample_rate is None:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"error": "Originalrate and SampleRate is required"})
            }

        allowed_rates = [8000, 16000, 22050, 44100, 48000]
        if target_sample_rate not in allowed_rates:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"error": f"Unsupported sample rate. Choose from {allowed_rates}"})
            }

        # Convert and optionally flatten stereo to mono
        signal = np.array(raw_signal)
        if signal.ndim > 1:
            signal = signal.mean(axis=1)

        # Resample the signal
        num_samples = int(len(signal) * target_sample_rate / original_sample_rate)
        resampled_signal = resample(signal, num_samples)


        # Time domain
        duration = len(resampled_signal) / target_sample_rate
        time = np.linspace(0, duration, len(resampled_signal), endpoint=False)

        # Frequency domain
        freq_domain = fft(resampled_signal)
        amplitudes = np.abs(freq_domain[:len(freq_domain) // 2])
        frequencies = np.linspace(0, target_sample_rate / 2, len(amplitudes), endpoint=False)

    

        response = {
            "frequencies": frequencies.tolist(),
            "amplitudes": amplitudes.tolist(),
            "time": time.tolist(),
            "waveformAmplitude": resampled_signal.tolist()
        }

        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps(response)
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"error": str(e)})
        }
