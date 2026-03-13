"use client";

import React, { useState } from "react";
import ToolLayout from "@/components/ToolLayout";

export default function BMICalculatorPage() {
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [bmi, setBmi] = useState<number | null>(null);

  const calculateBMI = () => {
    const h = parseFloat(height) / 100; // convert cm to m
    const w = parseFloat(weight);

    if (h > 0 && w > 0) {
      setBmi(w / (h * h));
    } else {
      setBmi(null);
    }
  };

  const getBMICategory = (bmiValue: number) => {
    if (bmiValue < 18.5) return { category: "Underweight", color: "text-blue-500", bg: "bg-blue-50" };
    if (bmiValue < 25) return { category: "Normal weight", color: "text-green-500", bg: "bg-green-50" };
    if (bmiValue < 30) return { category: "Overweight", color: "text-yellow-500", bg: "bg-yellow-50" };
    return { category: "Obese", color: "text-red-500", bg: "bg-red-50" };
  };

  return (
    <ToolLayout 
      title="BMI Calculator" 
      description="Calculate your Body Mass Index (BMI) to determine if you are at a healthy weight."
    >
      <div className="max-w-md mx-auto">
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-1">Height (cm)</label>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            placeholder="e.g. 175"
            className="w-full p-3 border border-gray-300 rounded focus:ring-primary focus:border-primary outline-none"
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-1">Weight (kg)</label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="e.g. 70"
            className="w-full p-3 border border-gray-300 rounded focus:ring-primary focus:border-primary outline-none"
          />
        </div>

        <button
          onClick={calculateBMI}
          className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium mb-8"
        >
          Calculate BMI
        </button>

        {bmi !== null && (
          <div className={`p-6 rounded-2xl text-center border ${getBMICategory(bmi).bg.replace('bg-', 'border-')}`}>
            <p className="text-gray-500 mb-2">Your BMI is</p>
            <p className="text-5xl font-extrabold text-gray-900 mb-2">
              {bmi.toFixed(1)}
            </p>
            <p className={`text-xl font-bold ${getBMICategory(bmi).color}`}>
              {getBMICategory(bmi).category}
            </p>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
