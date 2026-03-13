"use client";

import React, { useState, useRef } from "react";
import ToolLayout from "@/components/ToolLayout";

export default function JpgToPngConverterPage() {
  const [image, setImage] = useState<string | null>(null);
  const [convertedImage, setConvertedImage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === "image/jpeg" || file.type === "image/jpg")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        setConvertedImage(null);
      };
      reader.readAsDataURL(file);
    } else {
      alert("Please select a valid JPG/JPEG file.");
    }
  };

  const convertToPng = () => {
    if (!image || !canvasRef.current) return;

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d");
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      setConvertedImage(canvas.toDataURL("image/png"));
    };
    img.src = image;
  };

  return (
    <ToolLayout 
      title="JPG to PNG Converter" 
      description="Convert your JPG images to PNG securely. Everything is done inside your browser."
    >
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer relative mb-6">
        <input 
          type="file" 
          accept=".jpg,.jpeg" 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleImageUpload}
        />
        <p className="text-gray-600 font-medium">Upload JPG/JPEG picture</p>
      </div>

      {image && (
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
          <button 
            onClick={convertToPng}
            className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium mb-4"
          >
            Convert to PNG
          </button>

          <canvas ref={canvasRef} className="hidden" />

          {convertedImage && (
            <div className="mt-6 border-t border-gray-200 pt-6 text-center">
              <a 
                href={convertedImage} 
                download="converted_image.png"
                className="block text-center w-full py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Download PNG Output
              </a>
            </div>
          )}
        </div>
      )}
    </ToolLayout>
  );
}
