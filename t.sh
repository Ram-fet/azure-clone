#!/bin/bash
set -e

echo "🔍 Checking for mismatched wheels (cp310 vs cp311)..."

# Find wheels for cp310
BAD_WHEELS=$(ls deps | grep -E 'cp310' || true)

if [ -z "$BAD_WHEELS" ]; then
  echo "✅ No invalid cp310 wheels found."
else
  echo "⚠️ Found invalid wheels:"
  echo "$BAD_WHEELS"
  echo "🧹 Removing them..."
  rm -f deps/*cp310*.whl
fi

echo "📦 Re-downloading compatible wheels for Python 3.11..."
pip download \
  markupsafe==2.1.5 \
  cffi==1.17.1 \
  numpy==2.2.2 \
  pillow==12.0.0 \
  pydantic_core==2.41.4 \
  charset_normalizer==3.4.4 \
  pyyaml==6.0.3 \
  regex==2025.11.3 \
  -d ./deps

echo "🧠 Downloading CPU-optimized PyTorch wheels..."
pip download torch==2.3.1+cpu torchvision==0.18.1+cpu torchaudio==2.3.1+cpu \
  -d ./deps --index-url https://download.pytorch.org/whl/cpu

echo "✅ All dependencies fixed for Python 3.11."
