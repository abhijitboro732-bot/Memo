"use client";

import React, { useState } from "react";
import ToolLayout from "@/components/ToolLayout";

export default function AgeCalculatorPage() {
  const [dob, setDob] = useState("");
  const [result, setResult] = useState<{ years: number; months: number; days: number } | null>(null);

  const calculateAge = () => {
    if (!dob) return;
    
    const birthDate = new Date(dob);
    const today = new Date();
    
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();

    if (days < 0) {
      months -= 1;
      const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += lastMonth.getDate();
    }

    if (months < 0) {
      years -= 1;
      months += 12;
    }

    if (years < 0) {
      setResult(null);
      return;
    }

    setResult({ years, months, days });
  };

  return (
    <ToolLayout 
      title="Age Calculator" 
      description="Calculate your exact age in years, months, and days."
    >
      <div className="max-w-md">
        <label className="block text-gray-700 font-medium mb-2">Date of Birth</label>
        <input
          type="date"
          value={dob}
          onChange={(e) => {
            setDob(e.target.value);
            setResult(null); // Clear result on change
          }}
          className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none text-gray-700 mb-6 bg-white"
        />

        <button
          onClick={calculateAge}
          className="w-full py-4 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors font-semibold text-lg mb-8"
        >
          Calculate Age
        </button>

        {result && (
          <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 text-center">
            <p className="text-gray-500 mb-2">You are exactly</p>
            <div className="text-4xl font-extrabold text-gray-900 mb-4">
              {result.years} <span className="text-2xl text-gray-500 font-medium tracking-normal">years</span>
            </div>
            <div className="flex justify-center gap-6">
              <div>
                <p className="text-2xl font-bold text-gray-900">{result.months}</p>
                <p className="text-sm text-gray-500 font-medium">months</p>
              </div>
              <div className="w-px bg-blue-200"></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{result.days}</p>
                <p className="text-sm text-gray-500 font-medium">days</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
