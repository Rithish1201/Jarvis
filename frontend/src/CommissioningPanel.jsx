import { useState } from "react";
import { Activity, AlertTriangle, CheckCircle, ChevronRight, Settings, Shield, Zap, ThermometerSun, Gauge, Factory } from "lucide-react";

const API_BASE = 'http://127.0.0.1:8000';

export default function CommissioningPanel({ onBack }) {
  const [specs, setSpecs] = useState({
    machine_type: "",
    rated_power: 10,
    rated_rpm: 2000,
    rated_temperature: 60,
    environment: "normal"
  });
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAnalyze = async () => {
    if (!specs.machine_type.trim()) {
      setError("Please enter a machine type");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/commissioning/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(specs)
      });

      if (!res.ok) throw new Error("Analysis failed");

      const data = await res.json();
      setAnalysis(data);
    } catch (err) {
      setError(err.message || "Failed to analyze");
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case "high": return "text-red-400 bg-red-500/20";
      case "medium": return "text-yellow-400 bg-yellow-500/20";
      case "low": return "text-green-400 bg-green-500/20";
      default: return "text-cyan-400 bg-cyan-500/20";
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical": return "border-red-500 text-red-400";
      case "warning": return "border-yellow-500 text-yellow-400";
      default: return "border-cyan-500 text-cyan-400";
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0e17', padding: '24px' }}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 text-cyan-400 transition-all"
        >
          ← Back
        </button>
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
            🏭 New Machine Commissioning Advisor
          </h1>
          <p className="text-slate-400 mt-1">Analyze factory history to optimize new machine setup</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Form */}
        <div className="lg:col-span-1">
          <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-cyan-500/30 p-6">
            <h2 className="text-xl font-semibold text-cyan-400 mb-4 flex items-center gap-2">
              <Settings size={20} /> Machine Specifications
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 block mb-1">Machine Type *</label>
                <input
                  type="text"
                  value={specs.machine_type}
                  onChange={(e) => setSpecs({ ...specs, machine_type: e.target.value })}
                  placeholder="e.g., CNC Lathe, Milling Machine"
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 block mb-1">Rated Power (kW)</label>
                <input
                  type="number"
                  value={specs.rated_power}
                  onChange={(e) => setSpecs({ ...specs, rated_power: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 block mb-1">Rated RPM</label>
                <input
                  type="number"
                  value={specs.rated_rpm}
                  onChange={(e) => setSpecs({ ...specs, rated_rpm: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 block mb-1">Max Operating Temp (°C)</label>
                <input
                  type="number"
                  value={specs.rated_temperature}
                  onChange={(e) => setSpecs({ ...specs, rated_temperature: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 block mb-1">Environment</label>
                <select
                  value={specs.environment}
                  onChange={(e) => setSpecs({ ...specs, environment: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="normal">Normal</option>
                  <option value="high_humidity">High Humidity</option>
                  <option value="dusty">Dusty</option>
                  <option value="hot">Hot Environment</option>
                  <option value="cold">Cold Environment</option>
                </select>
              </div>

              {error && (
                <div className="text-red-400 text-sm bg-red-500/20 p-3 rounded-lg">
                  ⚠️ {error}
                </div>
              )}

              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-semibold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap size={18} /> Analyze Factory History
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-6">
          {!analysis && !loading && (
            <div className="bg-slate-800/30 backdrop-blur rounded-xl border border-slate-600/30 p-12 text-center">
              <Factory size={64} className="text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl text-slate-400">Enter Machine Specifications</h3>
              <p className="text-slate-500 mt-2">Fill in the form and click "Analyze" to get recommendations based on factory history</p>
            </div>
          )}

          {analysis && (
            <>
              {/* Summary */}
              <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-cyan-500/30 p-6">
                <h2 className="text-xl font-semibold text-cyan-400 mb-4 flex items-center gap-2">
                  <Activity size={20} /> Analysis Summary
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-700/30 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-cyan-400">{analysis.summary?.total_patterns_found || 0}</div>
                    <div className="text-sm text-slate-400">Patterns Found</div>
                  </div>
                  <div className="bg-red-500/20 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-400">{analysis.summary?.risk_count?.high || 0}</div>
                    <div className="text-sm text-slate-400">High Risks</div>
                  </div>
                  <div className="bg-yellow-500/20 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-400">{analysis.summary?.risk_count?.medium || 0}</div>
                    <div className="text-sm text-slate-400">Medium Risks</div>
                  </div>
                  <div className="bg-green-500/20 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-400">{analysis.summary?.data_confidence || "N/A"}</div>
                    <div className="text-sm text-slate-400">Data Confidence</div>
                  </div>
                </div>
              </div>

              {/* Operational Risks */}
              {analysis.operational_risks?.length > 0 && (
                <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-red-500/30 p-6">
                  <h2 className="text-xl font-semibold text-red-400 mb-4 flex items-center gap-2">
                    <AlertTriangle size={20} /> Operational Risks
                  </h2>
                  <div className="space-y-3">
                    {analysis.operational_risks.map((risk, idx) => (
                      <div key={idx} className={`p-4 rounded-lg border-l-4 ${getRiskColor(risk.level)}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getRiskColor(risk.level)}`}>
                            {risk.level?.toUpperCase()}
                          </span>
                          <span className="text-white font-medium">{risk.category}</span>
                        </div>
                        <p className="text-slate-300 text-sm">{risk.description}</p>
                        <p className="text-cyan-400 text-sm mt-2">💡 {risk.mitigation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Safe Operating Limits */}
              <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-green-500/30 p-6">
                <h2 className="text-xl font-semibold text-green-400 mb-4 flex items-center gap-2">
                  <Shield size={20} /> Safe Operating Limits
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {["temperature", "vibration", "rpm"].map((param) => {
                    const limits = analysis.safe_operating_limits?.[param];
                    if (!limits) return null;
                    const icons = {
                      temperature: <ThermometerSun size={20} className="text-orange-400" />,
                      vibration: <Activity size={20} className="text-purple-400" />,
                      rpm: <Gauge size={20} className="text-blue-400" />
                    };
                    const units = { temperature: "°C", vibration: "mm/s", rpm: "RPM" };
                    return (
                      <div key={param} className="bg-slate-700/30 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          {icons[param]}
                          <span className="text-white font-medium capitalize">{param}</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Optimal:</span>
                            <span className="text-green-400">{limits.optimal} {units[param]}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Warning:</span>
                            <span className="text-yellow-400">{limits.warning} {units[param]}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Critical:</span>
                            <span className="text-red-400">{limits.critical} {units[param]}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Configuration Recommendations */}
              <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-purple-500/30 p-6">
                <h2 className="text-xl font-semibold text-purple-400 mb-4 flex items-center gap-2">
                  <Settings size={20} /> Configuration Recommendations
                </h2>
                <div className="space-y-3">
                  {analysis.configuration_recommendations?.map((rec, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-700/30 p-4 rounded-lg">
                      <div>
                        <div className="text-white font-medium">{rec.parameter}</div>
                        <div className="text-slate-400 text-sm">{rec.reason}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-cyan-400">{rec.recommended_value}</div>
                        <div className="text-slate-500 text-sm">{rec.unit}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preventive Guidelines */}
              <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-cyan-500/30 p-6">
                <h2 className="text-xl font-semibold text-cyan-400 mb-4 flex items-center gap-2">
                  <CheckCircle size={20} /> Preventive Guidelines
                </h2>
                <div className="space-y-2">
                  {analysis.preventive_guidelines?.map((guideline, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-slate-700/20 rounded-lg">
                      <ChevronRight size={18} className="text-cyan-400 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-300">{guideline}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Failure Patterns */}
              {analysis.failure_patterns?.length > 0 && (
                <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-orange-500/30 p-6">
                  <h2 className="text-xl font-semibold text-orange-400 mb-4 flex items-center gap-2">
                    <AlertTriangle size={20} /> Historical Failure Patterns
                  </h2>
                  <div className="space-y-3">
                    {analysis.failure_patterns.slice(0, 5).map((pattern, idx) => (
                      <div key={idx} className={`p-4 rounded-lg border-l-4 ${getSeverityColor(pattern.severity)}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-medium capitalize">{pattern.type} Issue</span>
                          <span className="text-slate-400 text-sm">{pattern.occurrences} occurrences</span>
                        </div>
                        <p className="text-slate-400 text-sm mb-2">
                          <strong>Root Cause:</strong> {pattern.root_cause}
                        </p>
                        <p className="text-cyan-400 text-sm">
                          <strong>Prevention:</strong> {pattern.prevention}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
