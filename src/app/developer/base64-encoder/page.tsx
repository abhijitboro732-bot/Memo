"use client";

import React, { useState } from "react";
import ToolLayout from "@/components/ToolLayout";

export default function Base64EncoderPage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [error, setError] = useState<string | null>(null);

  const processData = (text: string, currentMode: "encode" | "decode") => {
    setInput(text);
    setError(null);
    if (!text) {
      setOutput("");
      return;
    }
    
    try {
      if (currentMode === "encode") {
        // Handle utf-8 string encoding
        const encoded = Buffer.from(text, 'utf-8').toString('base64');
        setOutput(encoded);
      } else {
        const decoded = Buffer.from(text, 'base64').toString('utf-8');
        setOutput(decoded);
      }
    } catch (err: any) {
      setError("Invalid input for " + currentMode);
      setOutput("");
    }
  };

  const handleModeToggle = (newMode: "encode" | "decode") => {
    setMode(newMode);
    processData(input, newMode);
  };

  return (
    <ToolLayout 
      title="Base64 Encoder & Decoder" 
      description="Encode string data to Base64 format or decode Base64 back to string."
    >
      <div className="flex bg-gray-100 p-1 rounded-lg w-max mb-6">
        <button 
          onClick={() => handleModeToggle("encode")}
          className={`px-6 py-2 rounded-md font-medium transition-colors ${mode === "encode" ? "bg-white text-primary shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
        >
          Encode
        </button>
        <button 
          onClick={() => handleModeToggle("decode")}
          className={`px-6 py-2 rounded-md font-medium transition-colors ${mode === "decode" ? "bg-white text-primary shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
        >
          Decode
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
           <label className="block text-gray-700 font-medium mb-2">
             Input Data
           </label>
           <textarea
             value={input}
             onChange={(e) => processData(e.target.value, mode)}
             className="w-full h-64 p-4 border border-gray-300 rounded focus:ring-primary focus:border-primary outline-none resize-none font-mono"
             placeholder={mode === "encode" ? "Type text to encode..." : "Paste Base64 to decode..."}
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
             className="w-full h-64 p-4 border border-gray-300 bg-gray-50 rounded focus:ring-primary focus:border-primary outline-none resize-none font-mono"
             placeholder="Result will appear here..."
           />
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => {
             if (output) navigator.clipboard.writeText(output);
          }}
          className="px-6 py-2.5 bg-primary text-white rounded hover:bg-primary-hover transition-colors font-medium"
        >
          Copy Output
        </button>
        <button
          onClick={() => {
            setInput("");
            setOutput("");
            setError(null);
          }}
          className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors font-medium"
        >
          Clear
        </button>
      </div>
    </ToolLayout>
  );
}
