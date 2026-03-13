import React from "react";

interface ToolLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export default function ToolLayout({ title, description, children }: ToolLayoutProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-500">{description}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-8">
        {children}
      </div>

      {/* Embedded AdSense space inside tool pages */}
      <div className="w-full bg-gray-50 flex justify-center py-8 rounded-xl border border-gray-100 mb-12">
        <div className="text-sm text-gray-400 border border-dashed border-gray-300 w-full max-w-2xl h-32 flex items-center justify-center rounded">
          AdSense Placeholder (Inside Tool Page)
        </div>
      </div>
    </div>
  );
}
