"use client";

import React, { useState } from "react";
import ToolLayout from "@/components/ToolLayout";

export default function PercentageCalculatorPage() {
  const [val1, setVal1] = useState("");
  const [val2, setVal2] = useState("");
  const [result1, setResult1] = useState<number | string>("");

  const [val3, setVal3] = useState("");
  const [val4, setVal4] = useState("");
  const [result2, setResult2] = useState<number | string>("");

  const calculateType1 = () => {
    const p = parseFloat(val1);
    const v = parseFloat(val2);
    if (!isNaN(p) && !isNaN(v)) {
      setResult1((p / 100) * v);
    } else {
      setResult1("Invalid input");
    }
  };

  const calculateType2 = () => {
    const v1 = parseFloat(val3);
    const v2 = parseFloat(val4);
    if (!isNaN(v1) && !isNaN(v2) && v2 !== 0) {
      setResult2(((v1 / v2) * 100).toFixed(2));
    } else {
      setResult2("Invalid input");
    }
  };

  return (
    <ToolLayout 
      title="Percentage Calculator" 
      description="Quickly calculate percentages, find out what percentage one number is of another."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Type 1 Container */}
        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">What is X% of Y?</h3>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-gray-600">What is</span>
            <input 
              type="number" 
              value={val1}
              onChange={(e) => setVal1(e.target.value)}
              className="w-20 p-2 border border-gray-300 rounded focus:ring-primary focus:border-primary outline-none" 
            />
            <span className="text-gray-600">% of</span>
            <input 
              type="number" 
              value={val2}
              onChange={(e) => setVal2(e.target.value)}
              className="w-24 p-2 border border-gray-300 rounded focus:ring-primary focus:border-primary outline-none" 
            />
          </div>
          <button 
            onClick={calculateType1}
            className="w-full py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors font-medium mb-4"
          >
            Calculate
          </button>
          
          <div className="p-4 bg-white border border-gray-200 rounded-lg min-h-[60px] flex items-center justify-center">
             {result1 !== "" && (
               <p className="text-lg">
                 Result: <span className="font-bold text-primary text-xl">{result1}</span>
               </p>
             )}
          </div>
        </div>

        {/* Type 2 Container */}
        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">X is what % of Y?</h3>
          <div className="flex items-center gap-3 mb-4">
            <input 
              type="number" 
              value={val3}
              onChange={(e) => setVal3(e.target.value)}
              className="w-24 p-2 border border-gray-300 rounded focus:ring-primary focus:border-primary outline-none" 
            />
            <span className="text-gray-600">is what % of</span>
            <input 
              type="number" 
              value={val4}
              onChange={(e) => setVal4(e.target.value)}
              className="w-24 p-2 border border-gray-300 rounded focus:ring-primary focus:border-primary outline-none" 
            />
          </div>
          <button 
            onClick={calculateType2}
            className="w-full py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors font-medium mb-4"
          >
            Calculate
          </button>
          
          <div className="p-4 bg-white border border-gray-200 rounded-lg min-h-[60px] flex items-center justify-center">
             {result2 !== "" && (
               <p className="text-lg">
                 Result: <span className="font-bold text-primary text-xl">{result2}%</span>
               </p>
             )}
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
