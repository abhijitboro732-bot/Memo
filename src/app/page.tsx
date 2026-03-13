import ToolCard from "@/components/ToolCard";
import { 
  Image as ImageIcon, 
  Minimize, 
  RefreshCcw, 
  Type, 
  CaseSensitive, 
  Key,
  Calendar,
  Percent,
  Activity,
  Code,
  Binary
} from "lucide-react";

export default function Home() {
  const tools = [
    { title: "Image Compressor", description: "Reduce image file size with high quality.", href: "/image/compressor", icon: Minimize, category: "Image" },
    { title: "Image Resizer", description: "Resize images to specific dimensions easily.", href: "/image/resizer", icon: ImageIcon, category: "Image" },
    { title: "JPG to PNG", description: "Convert JPG/JPEG images to PNG format.", href: "/image/jpg-to-png", icon: RefreshCcw, category: "Image" },
    { title: "Word Counter", description: "Count words, characters, and sentences.", href: "/text/word-counter", icon: Type, category: "Text" },
    { title: "Case Converter", description: "Change text to UPPERCASE, lowercase, etc.", href: "/text/case-converter", icon: CaseSensitive, category: "Text" },
    { title: "Password Generator", description: "Create strong and secure passwords.", href: "/text/password-generator", icon: Key, category: "Text" },
    { title: "Age Calculator", description: "Calculate your exact age in years, months, and days.", href: "/calculator/age", icon: Calendar, category: "Calculator" },
    { title: "Percentage Calculator", description: "Easily calculate percentages and discounts.", href: "/calculator/percentage", icon: Percent, category: "Calculator" },
    { title: "BMI Calculator", description: "Calculate Body Mass Index (BMI).", href: "/calculator/bmi", icon: Activity, category: "Calculator" },
    { title: "JSON Formatter", description: "Beautify and format JSON code.", href: "/developer/json-formatter", icon: Code, category: "Developer" },
    { title: "Base64 Encoder/Decoder", description: "Encode or decode strings via Base64.", href: "/developer/base64-encoder", icon: Binary, category: "Developer" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
          Free Online Tools for <span className="text-primary">Everyday Needs</span>
        </h1>
        <p className="text-xl text-gray-500">
          A collection of simple, fast, and free utilities to help you with images, text, math, and code. No sign-up required.
        </p>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tools.map((tool) => (
          <ToolCard 
            key={tool.title}
            title={tool.title}
            description={tool.description}
            href={tool.href}
            icon={tool.icon}
          />
        ))}
      </div>
    </div>
  );
}
