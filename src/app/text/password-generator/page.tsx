"use client";

import React, { useState, useEffect } from "react";
import ToolLayout from "@/components/ToolLayout";
import { Copy, RefreshCw } from "lucide-react";

export default function PasswordGeneratorPage() {
  const [password, setPassword] = useState("");
  const [length, setLength] = useState(16);
  const [options, setOptions] = useState({
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  });

  const generatePassword = () => {
    const charset = {
      uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      lowercase: "abcdefghijklmnopqrstuvwxyz",
      numbers: "0123456789",
      symbols: "!@#$%^&*()_+~`|}{[]:;?><,./-=",
    };

    let allowedChars = "";
    if (options.uppercase) allowedChars += charset.uppercase;
    if (options.lowercase) allowedChars += charset.lowercase;
    if (options.numbers) allowedChars += charset.numbers;
    if (options.symbols) allowedChars += charset.symbols;

    if (!allowedChars) allowedChars = charset.lowercase; // fallback

    let newPassword = "";
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * allowedChars.length);
      newPassword += allowedChars[randomIndex];
    }
    setPassword(newPassword);
  };

  useEffect(() => {
    generatePassword();
  }, [length, options]);

  const handleCopy = () => {
    navigator.clipboard.writeText(password);
  };

  const toggleOption = (key: keyof typeof options) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <ToolLayout 
      title="Password Generator" 
      description="Create strong, secure passwords to keep your accounts safe online."
    >
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8 flex items-center justify-between">
        <span className="text-3xl font-mono text-gray-900 break-all space-x-1">{password}</span>
        <div className="flex gap-2 shrink-0 ml-4">
          <button
            onClick={generatePassword}
            className="p-3 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            title="Generate new"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={handleCopy}
            className="p-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
            title="Copy password"
          >
            <Copy className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="space-y-6 max-w-lg">
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-gray-700 font-medium">Password Length</label>
            <span className="text-primary font-bold">{length}</span>
          </div>
          <input
            type="range"
            min="6"
            max="64"
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={options.uppercase}
              onChange={() => toggleOption("uppercase")}
              className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <span className="text-gray-700 font-medium">Uppercase (A-Z)</span>
          </label>
          <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={options.lowercase}
              onChange={() => toggleOption("lowercase")}
              className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <span className="text-gray-700 font-medium">Lowercase (a-z)</span>
          </label>
          <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={options.numbers}
              onChange={() => toggleOption("numbers")}
              className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <span className="text-gray-700 font-medium">Numbers (0-9)</span>
          </label>
          <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={options.symbols}
              onChange={() => toggleOption("symbols")}
              className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <span className="text-gray-700 font-medium">Symbols (!@#$)</span>
          </label>
        </div>
      </div>
    </ToolLayout>
  );
}
