"use client";

import React, { useState } from "react";
import ToolLayout from "@/components/ToolLayout";

export default function WordCounterPage() {
  const [text, setText] = useState("");

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, "").length;
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
  const paragraphs = text.split(/\n+/).filter((p) => p.trim().length > 0).length;

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
  };

  const handleClear = () => {
    setText("");
  };

  return (
    <ToolLayout 
      title="Word Counter" 
      description="Count words, characters, sentences, and paragraphs in your text instantly."
    >
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-xl text-center">
          <p className="text-2xl font-bold text-primary">{words}</p>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Words</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl text-center">
          <p className="text-2xl font-bold text-primary">{characters}</p>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Characters</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl text-center hidden md:block">
          <p className="text-2xl font-bold text-primary">{charactersNoSpaces}</p>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">No Spaces</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl text-center">
          <p className="text-2xl font-bold text-primary">{sentences}</p>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Sentences</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl text-center">
          <p className="text-2xl font-bold text-primary">{paragraphs}</p>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Paragraphs</p>
        </div>
      </div>

      <textarea
        className="w-full h-64 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-y"
        placeholder="Type or paste your text here to count words..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="flex gap-4 mt-4">
        <button
          onClick={handleCopy}
          className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium flex items-center justify-center gap-2"
        >
          Copy Text
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
