"use client";

import React, { useState, useRef } from "react";
import ToolLayout from "@/components/ToolLayout";

export default function ImageCompressorPage() {
  const [image, setImage] = useState<string | null>(null);
  const [quality, setQuality] = useState(0.8);
  const [compressedImage, setCompressedImage] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState<number | null>(null);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOriginalSize(file.size);
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        setCompressedImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const compressImage = () => {
    if (!image || !canvasRef.current) return;

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d");
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
      setCompressedImage(compressedDataUrl);

      // Estimate final size: Length of base64 * 0.75
      setCompressedSize(Math.round(compressedDataUrl.length * 0.75));
    };
    img.src = image;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadImage = () => {
    if (compressedImage) {
      const link = document.createElement("a");
      link.href = compressedImage;
      link.download = "compressed_image.jpg";
      link.click();
    }
  };

  return (
    <ToolLayout 
      title="Image Compressor" 
      description="Compress your JPG or PNG images directly in your browser without losing quality."
    >
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer relative mb-6">
        <input 
          type="file" 
          accept="image/*" 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleImageUpload}
        />
        <p className="text-gray-600 font-medium">Click or drag image to upload</p>
        <p className="text-sm text-gray-400 mt-2">Supports JPG, PNG, WEBP</p>
      </div>

      {image && (
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
          <div className="mb-6">
            <label className="flex justify-between text-gray-700 font-medium mb-2">
              Compression Quality
              <span className="text-primary">{Math.round(quality * 100)}%</span>
            </label>
            <input 
              type="range" 
              min="0.1" 
              max="1" 
              step="0.1" 
              value={quality} 
              onChange={(e) => setQuality(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <button 
            onClick={compressImage}
            className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium mb-6"
          >
            Compress Image
          </button>

          <canvas ref={canvasRef} className="hidden" />

          {compressedImage && (
            <div className="bg-white p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-4">Result</h3>
              <div className="flex justify-between items-center mb-4 text-sm bg-blue-50 p-3 rounded">
                <div>
                  <span className="text-gray-500">Original size:</span>
                  <span className="font-bold ml-2 text-gray-900">{originalSize && formatSize(originalSize)}</span>
                </div>
                <div>
                  <span className="text-gray-500">New size:</span>
                  <span className="font-bold ml-2 text-green-600">{compressedSize && formatSize(compressedSize)}</span>
                </div>
              </div>
              
              <div className="mb-4 max-h-64 overflow-hidden border border-gray-200 rounded">
                 <img src={compressedImage} alt="Compressed preview" className="object-contain w-full h-full" />
              </div>

              <button 
                onClick={downloadImage}
                className="w-full py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Download Compressed Image
              </button>
            </div>
          )}
        </div>
      )}
    </ToolLayout>
  );
}
