"use client";

import React, { useState, useRef } from "react";
import ToolLayout from "@/components/ToolLayout";

export default function ImageResizerPage() {
  const [image, setImage] = useState<string | null>(null);
  const [width, setWidth] = useState<number | "">("");
  const [height, setHeight] = useState<number | "">("");
  const [maintainRatio, setMaintainRatio] = useState(true);
  const [originalAspectRatio, setOriginalAspectRatio] = useState(1);
  const [resizedImage, setResizedImage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setImage(result);
        
        // determine width/height defaults
        const img = new Image();
        img.onload = () => {
           setWidth(img.width);
           setHeight(img.height);
           setOriginalAspectRatio(img.width / img.height);
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleWidthChange = (val: string) => {
    const num = parseInt(val);
    setWidth(isNaN(num) ? "" : num);
    if (!isNaN(num) && maintainRatio) {
      setHeight(Math.round(num / originalAspectRatio));
    }
  };

  const handleHeightChange = (val: string) => {
    const num = parseInt(val);
    setHeight(isNaN(num) ? "" : num);
    if (!isNaN(num) && maintainRatio) {
      setWidth(Math.round(num * originalAspectRatio));
    }
  };

  const resizeImage = () => {
    if (!image || !canvasRef.current || !width || !height) return;

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d");
      
      canvas.width = Number(width);
      canvas.height = Number(height);
      
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      setResizedImage(canvas.toDataURL("image/png"));
    };
    img.src = image;
  };

  return (
    <ToolLayout 
      title="Image Resizer" 
      description="Quickly resize images to exact pixel dimensions securely in your browser."
    >
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer relative mb-6">
        <input 
          type="file" 
          accept="image/*" 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleImageUpload}
        />
        <p className="text-gray-600 font-medium">Upload Image to Resize</p>
      </div>

      {image && (
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-gray-700 font-medium mb-1">Width (px)</label>
              <input 
                type="number" 
                value={width} 
                onChange={(e) => handleWidthChange(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:border-primary outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="block text-gray-700 font-medium mb-1">Height (px)</label>
              <input 
                type="number" 
                value={height} 
                onChange={(e) => handleHeightChange(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:border-primary outline-none"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 mb-6 cursor-pointer">
            <input 
              type="checkbox" 
              checked={maintainRatio} 
              onChange={() => setMaintainRatio(!maintainRatio)} 
              className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
            />
            <span className="text-gray-700 text-sm font-medium">Maintain aspect ratio</span>
          </label>

          <button 
            onClick={resizeImage}
            className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium mb-4"
          >
            Resize Image
          </button>

          <canvas ref={canvasRef} className="hidden" />

          {resizedImage && (
            <div className="mt-6 border-t border-gray-200 pt-6">
              <div className="mb-4 bg-white p-2 border border-gray-200 rounded max-h-64 overflow-hidden flex justify-center">
                 <img src={resizedImage} alt="Resized preview" className="object-contain w-full h-full" />
              </div>
              <a 
                href={resizedImage} 
                download="resized_image.png"
                className="block text-center w-full py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Download Resized Image
              </a>
            </div>
          )}
        </div>
      )}
    </ToolLayout>
  );
}
