"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { fetchConfig, saveConfig } from "@/lib/store/configSlice";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Check, AlertCircle, Settings2 } from "lucide-react";

type FormData = {
  model: string;
  theme: string;
  logLevel: string;
};

export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const { config, isLoading, isSaving, error } = useAppSelector((state) => state.config);
  
  const [formData, setFormData] = useState<FormData>({
    model: "",
    theme: "dark",
    logLevel: "info",
  });
  
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    dispatch(fetchConfig());
  }, [dispatch]);

  useEffect(() => {
    if (config) {
      setFormData({
        model: (config.model as string) || "",
        theme: (config.theme as string) || "dark",
        logLevel: (config.logLevel as string) || "info",
      });
    }
  }, [config]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setShowSuccess(false);
    
    const result = await dispatch(saveConfig(formData));
    
    if (saveConfig.fulfilled.match(result)) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-8">
      {/* Hero Header */}
      <div className="mb-12 border-l-4 border-blue-500 pl-6">
        <div className="flex items-center gap-3 mb-2">
          <Settings2 className="h-8 w-8 text-blue-500" />
          <h1 className="text-5xl font-black tracking-tight text-white uppercase">
            System Config
          </h1>
        </div>
        <p className="text-gray-400 text-lg font-mono">
          Modify core OpenCode parameters
        </p>
      </div>

      {/* Main Form Container */}
      <div className="max-w-4xl">
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 shadow-2xl">
          <form onSubmit={handleSubmit}>
            {/* Form Grid */}
            <div className="p-8 space-y-8">
              {/* Model Selection */}
              <div className="group">
                <label className="block mb-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-500 group-hover:text-blue-400 transition-colors">
                    Model Selection
                  </span>
                  <span className="block text-sm text-gray-600 mt-1 font-mono">
                    Provider and model configuration
                  </span>
                </label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => handleChange("model", e.target.value)}
                  placeholder="e.g., anthropic/claude-3-5-sonnet"
                  className="w-full bg-gray-950 border-2 border-gray-800 text-white px-5 py-4 text-lg font-mono
                    focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:outline-none
                    transition-all duration-200 hover:border-gray-700"
                />
              </div>

              {/* Theme Selection */}
              <div className="group">
                <label className="block mb-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-500 group-hover:text-blue-400 transition-colors">
                    Theme
                  </span>
                  <span className="block text-sm text-gray-600 mt-1 font-mono">
                    Visual appearance mode
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {["dark", "light", "auto"].map((theme) => (
                    <button
                      key={theme}
                      type="button"
                      onClick={() => handleChange("theme", theme)}
                      className={`
                        px-6 py-4 font-bold uppercase tracking-wider text-sm
                        border-2 transition-all duration-200
                        ${
                          formData.theme === theme
                            ? "bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/50"
                            : "bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-300"
                        }
                      `}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </div>

              {/* Log Level Selection */}
              <div className="group">
                <label className="block mb-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-500 group-hover:text-blue-400 transition-colors">
                    Log Level
                  </span>
                  <span className="block text-sm text-gray-600 mt-1 font-mono">
                    Diagnostic output verbosity
                  </span>
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {["debug", "info", "warn", "error"].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => handleChange("logLevel", level)}
                      className={`
                        px-6 py-4 font-bold uppercase tracking-wider text-sm
                        border-2 transition-all duration-200
                        ${
                          formData.logLevel === level
                            ? "bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/50"
                            : "bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-300"
                        }
                      `}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="border-t-2 border-gray-800 bg-gray-950/80 p-6 flex items-center justify-between">
              {/* Status Messages */}
              <div className="flex-1">
                {error && (
                  <div className="flex items-center gap-2 text-red-400 font-mono text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                )}
                {showSuccess && (
                  <div className="flex items-center gap-2 text-green-400 font-mono text-sm animate-in fade-in duration-300">
                    <Check className="h-4 w-4" />
                    <span>Configuration saved successfully</span>
                  </div>
                )}
              </div>

              {/* Save Button */}
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold uppercase tracking-wider px-8 py-6 text-base
                  border-2 border-blue-400 shadow-lg shadow-blue-500/30
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    Save Configuration
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Technical Info Footer */}
        <div className="mt-6 p-4 bg-gray-900/30 border border-gray-800/50 font-mono text-xs text-gray-600">
          <div className="flex justify-between items-center">
            <span>CONFIG_PATH: ~/.opencode/config.json</span>
            {config?.version && (
              <span className="text-blue-500">VERSION: {config.version}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
