import json
import math
import cmath

def next_power_of_two(n):
    return 1 << (n - 1).bit_length()

def fft(signal):
    N = len(signal)
    if N <= 1:
        return signal
    even = fft(signal[::2])
    odd = fft(signal[1::2])
    T = [cmath.exp(-2j * math.pi * k / N) * odd[k] for k in range(N // 2)]
    return [even[k] + T[k] for k in range(N // 2)] + \
           [even[k] - T[k] for k in range(N // 2)]

def compute_amplitude(signal):
    N = len(signal)
    spectrum = fft(signal)
    return [abs(spectrum[k]) / N for k in range(N)]

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
    "Access-Control-Allow-Headers": "Content-Type"
}

def lambda_handler(event, context):
    if event.get("httpMethod") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({"message": "Preflight CORS OK"})
        }

    body_raw = event.get("body")
    if not body_raw:
        return {
            "statusCode": 400,
            "headers": CORS_HEADERS,
            "body": json.dumps({"error": "Missing request body"})
        }

    try:
        body = json.loads(body_raw)
    except json.JSONDecodeError as e:
        return {
            "statusCode": 400,
            "headers": CORS_HEADERS,
            "body": json.dumps({"error": f"Invalid JSON: {str(e)}"})
        }

    signals = body.get("signals")
    if not isinstance(signals, list):
        return {
            "statusCode": 400,
            "headers": CORS_HEADERS,
            "body": json.dumps({"error": "'signals' must be a list of number arrays"})
        }

    output = []
    for i, raw_signal in enumerate(signals):
        try:
            signal = [complex(float(x)) for x in raw_signal]
        except Exception as e:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"error": f"Invalid signal at index {i}: {str(e)}"})
            }

        original_len = len(signal)
        padded_len = next_power_of_two(original_len)
        if padded_len > original_len:
            signal.extend([0j] * (padded_len - original_len))

        amplitudes = compute_amplitude(signal)
        frequencies = [k / padded_len for k in range(padded_len)]

        # Limit to first half (real signal FFT symmetry)
        half = padded_len // 2
        output.append({
            "original_length": original_len,
            "padded_length": padded_len,
            "frequencies": frequencies[:half],
            "amplitudes": amplitudes[:half]
        })

    return {
        "statusCode": 200,
        "headers": CORS_HEADERS,
        "body": json.dumps(output)
    }