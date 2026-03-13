"use client";

import React, { useState } from "react";
import ToolLayout from "@/components/ToolLayout";

export default function CaseConverterPage() {
  const [text, setText] = useState("");

  const transformText = (type: string) => {
    switch (type) {
      case "uppercase":
        setText(text.toUpperCase());
        break;
      case "lowercase":
        setText(text.toLowerCase());
        break;
      case "capitalize":
        setText(
          text.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
        );
        break;
      case "sentence":
        setText(
          text.toLowerCase().replace(/(^\w|\.\s+\w)/gm, (char) => char.toUpperCase())
        );
        break;
      case "alternating":
        setText(
          text.split("").map((c, i) => (i % 2 === 0 ? c.toLowerCase() : c.toUpperCase())).join("")
        );
        break;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
  };

  const handleClear = () => {
    setText("");
  };

  return (
    <ToolLayout 
      title="Case Converter" 
      description="Convert text between UPPERCASE, lowercase, Capitalized Case, and more."
    >
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => transformText("sentence")} className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium">Sentence case</button>
        <button onClick={() => transformText("lowercase")} className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium">lower case</button>
        <button onClick={() => transformText("uppercase")} className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium">UPPER CASE</button>
        <button onClick={() => transformText("capitalize")} className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium">Capitalized Case</button>
        <button onClick={() => transformText("alternating")} className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium">aLtErNaTiNg CaSe</button>
      </div>

      <textarea
        className="w-full h-64 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-y mb-4 text-base"
        placeholder="Type or paste your text here..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="flex gap-4">
        <button
          onClick={handleCopy}
          className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
        >
          Copy Output
        </button>
        <button
          onClick={handleClear}
          className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
        >
          Clear
        </button>
      </div>
    </ToolLayout>
  );
}
