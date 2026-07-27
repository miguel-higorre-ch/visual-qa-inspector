import React, { useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = 'https://mkb29dk9xg.execute-api.us-east-1.amazonaws.com/prod';
const S3_BUCKET = 'visual-qa-inspector-images-prod';
const S3_REGION = 'us-east-1';

function generateRunId() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Severity Badge ──────────────────────────────────────────────────────────

function SeverityBadge({ severity }) {
  const colors = {
    critical: 'bg-red-500 text-white',
    minor: 'bg-orange-500 text-white',
    cosmetic: 'bg-gray-500 text-white',
    pass: 'bg-green-500 text-white',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${colors[severity] || colors.cosmetic}`}>
      {severity}
    </span>
  );
}

// ─── Upload Zone ─────────────────────────────────────────────────────────────

function UploadZone({ label, file, onFileChange, previewUrl }) {
  return (
    <div className="flex-1 border-2 border-dashed border-gray-600 rounded-xl p-4 text-center hover:border-blue-500 transition-colors">
      <p className="text-sm font-medium text-gray-300 mb-2">{label}</p>
      <input
        type="file"
        accept="image/png,image/jpeg"
        onChange={(e) => onFileChange(e.target.files[0])}
        className="block w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
      />
      {previewUrl && (
        <img src={previewUrl} alt={label} className="mt-3 max-h-40 mx-auto rounded-lg border border-gray-700" />
      )}
    </div>
  );
}

// ─── Results Panel ───────────────────────────────────────────────────────────

function ResultsPanel({ report }) {
  if (!report) return null;

  return (
    <div className="mt-8 space-y-6">
      {/* Overall summary */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold">Analysis Results</h2>
          <SeverityBadge severity={report.overallSeverity} />
        </div>
        <p className="text-gray-300">{report.summary}</p>
        {report.noiseFiltered && (
          <p className="mt-2 text-xs text-gray-500 italic">
            🔇 Filtered noise: {report.noiseFiltered}
          </p>
        )}
        <div className="mt-3 flex gap-4 text-sm text-gray-400">
          <span>⏱ {(report.durationMs / 1000).toFixed(1)}s</span>
          <span>🔍 {report.diffsFound} issue(s)</span>
          <span>🔴 {report.criticalCount} critical</span>
          <span>🟠 {report.minorCount} minor</span>
        </div>
      </div>

      {/* Per viewport results */}
      {report.viewportResults?.map((vp) => (
        <div key={vp.viewport} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-3 capitalize">
            📱 {vp.viewport} viewport
          </h3>

          {vp.error && (
            <p className="text-red-400 text-sm mb-3">⚠️ {vp.error}</p>
          )}

          {/* Annotated image */}
          {vp.annotatedImageUrl && (
            <div className="mb-4">
              <img
                src={vp.annotatedImageUrl}
                alt={`Annotated ${vp.viewport} screenshot`}
                className="w-full max-w-2xl rounded-lg border border-gray-700 mx-auto"
              />
            </div>
          )}

          {/* Diff list */}
          {vp.diffs && vp.diffs.length > 0 && (
            <div className="space-y-3">
              {vp.diffs.map((diff, i) => (
                <div key={i} className="flex items-start gap-3 bg-gray-900 rounded-lg p-3 border border-gray-700">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <SeverityBadge severity={diff.severity} />
                    </div>
                    <p className="text-sm text-gray-200">{diff.description}</p>
                    {diff.suggested_fix && (
                      <p className="text-xs text-blue-400 mt-1">💡 {diff.suggested_fix}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {vp.diffs && vp.diffs.length === 0 && !vp.error && (
            <p className="text-green-400 text-sm">✅ No issues found in this viewport.</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const [baselineFile, setBaselineFile] = useState(null);
  const [currentFile, setCurrentFile] = useState(null);
  const [baselinePreview, setBaselinePreview] = useState(null);
  const [currentPreview, setCurrentPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = useCallback((setter, previewSetter) => (file) => {
    setter(file);
    if (file) {
      const url = URL.createObjectURL(file);
      previewSetter(url);
    } else {
      previewSetter(null);
    }
  }, []);

  async function uploadFileToS3(file, s3Key) {
    // Get pre-signed URL from our API
    const runId = s3Key.split('/')[1];
    const { data } = await axios.post(`${API_URL}/presign`, {
      runId,
      keys: [s3Key],
    });
    const presignedUrl = data.urls[s3Key];
    // Upload directly to S3
    await axios.put(presignedUrl, file, {
      headers: { 'Content-Type': file.type || 'image/png' },
    });
  }

  async function handleAnalyze() {
    if (!baselineFile || !currentFile) {
      setError('Please upload both baseline and current screenshots.');
      return;
    }

    setLoading(true);
    setError(null);
    setReport(null);
    setStatus('Generating run ID...');

    try {
      const runId = generateRunId();

      // Upload baseline
      setStatus('Uploading baseline screenshot...');
      const baselineKey = `baseline/${runId}/desktop/screenshot.png`;
      await uploadFileToS3(baselineFile, baselineKey);

      // Upload current
      setStatus('Uploading current screenshot...');
      const currentKey = `current/${runId}/desktop/screenshot.png`;
      await uploadFileToS3(currentFile, currentKey);

      // Trigger analysis
      setStatus('Analyzing with AI (this takes 15-30 seconds)...');
      const { data } = await axios.post(`${API_URL}/analyze`, {
        mode: 'regression',
        runId,
        viewports: ['desktop'],
        baselinePrefix: `baseline/${runId}/`,
        currentPrefix: `current/${runId}/`,
      });

      setReport(data);
      setStatus('');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Analysis failed');
      setStatus('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <span className="text-2xl">🔍</span>
          <div>
            <h1 className="text-xl font-bold tracking-tight">VisualQA Inspector</h1>
            <p className="text-xs text-gray-400">AI-powered visual regression testing — Amazon Bedrock</p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Upload section */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold mb-4">Upload Screenshots</h2>
          <p className="text-sm text-gray-400 mb-4">
            Upload a baseline (correct version) and a current (version to check) screenshot. 
            The AI will semantically analyze the differences.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <UploadZone
              label="📸 Baseline (correct version)"
              file={baselineFile}
              onFileChange={handleFileChange(setBaselineFile, setBaselinePreview)}
              previewUrl={baselinePreview}
            />
            <UploadZone
              label="📸 Current (version to check)"
              file={currentFile}
              onFileChange={handleFileChange(setCurrentFile, setCurrentPreview)}
              previewUrl={currentPreview}
            />
          </div>

          {/* Analyze button */}
          <button
            onClick={handleAnalyze}
            disabled={loading || !baselineFile || !currentFile}
            className={`w-full py-3 px-6 rounded-xl font-semibold text-lg transition-all ${
              loading || !baselineFile || !currentFile
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
            }`}
          >
            {loading ? '⏳ ' + status : '🔍 Analyze Differences'}
          </button>

          {/* Error display */}
          {error && (
            <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
              ❌ {error}
            </div>
          )}
        </div>

        {/* Results */}
        <ResultsPanel report={report} />

        {/* Footer */}
        <footer className="mt-12 text-center text-xs text-gray-600 pb-8">
          Built for Código Facilito × AWS × Kiro Hackathon 2026 · 
          Powered by Amazon Bedrock (Claude Sonnet 4.5) · 
          <a href="https://github.com/miguel-higorre-ch/visual-qa-inspector" className="text-blue-500 hover:underline ml-1">
            GitHub
          </a>
        </footer>
      </main>
    </div>
  );
}
