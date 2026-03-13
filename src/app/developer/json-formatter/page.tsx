"use client";

import React, { useState } from "react";
import ToolLayout from "@/components/ToolLayout";

export default function JsonFormatterPage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const formatJson = () => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch (err: any) {
      setError(err.message || "Invalid JSON input");
      setOutput("");
    }
  };

  const minifyJson = () => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
      setError(null);
    } catch (err: any) {
      setError(err.message || "Invalid JSON input");
      setOutput("");
    }
  };

  const clear = () => {
    setInput("");
    setOutput("");
    setError(null);
  };

  return (
    <ToolLayout 
      title="JSON Formatter & Validator" 
      description="Format, validate, or minify JSON data instantly."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-gray-700 font-medium mb-2">Input JSON</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full h-[400px] p-4 border border-gray-300 rounded font-mono text-sm focus:ring-primary focus:border-primary outline-none resize-none"
            placeholder="Paste your unformatted JSON here..."
          />
        </div>
        <div>
          <label className="block text-gray-700 font-medium mb-2 flex justify-between">
            Output
            {error && <span className="text-red-500 font-normal">{error}</span>}
          </label>
          <textarea
            value={output}
            readOnly
            className={`w-full h-[400px] p-4 border rounded font-mono text-sm outline-none resize-none ${error ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-gray-50'}`}
            placeholder="Formatted JSON will appear here..."
          />
        </div>
      </div>

      <div className="flex gap-4 mt-6">
        <button
          onClick={formatJson}
          className="px-6 py-2.5 bg-primary text-white rounded hover:bg-primary-hover transition-colors font-medium"
        >
          Format / Beautify
        </button>
        <button
          onClick={minifyJson}
          className="px-6 py-2.5 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors font-medium"
        >
          Minify
        </button>
        <button
          onClick={() => {
             if (output) navigator.clipboard.writeText(output);
          }}
          className="px-6 py-2.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-medium"
        >
          Copy Output
        </button>
        <button
          onClick={clear}
          className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors font-medium ml-auto"
        >
          Clear
        </button>
      </div>
    </ToolLayout>
  );
}
