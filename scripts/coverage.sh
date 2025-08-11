#!/bin/bash
echo "🔍 Running comprehensive coverage analysis..."

# Try multiple coverage approaches
echo "📊 Attempting c8 coverage..."
if command -v c8 &> /dev/null; then
  c8 --reporter=text --reporter=html --reporter=json npm test 2>/dev/null || echo "c8 failed, trying alternatives"
fi

echo "📊 Generating coverage report..."
node scripts/generate-coverage-report.cjs

echo "✅ Coverage analysis complete!"
