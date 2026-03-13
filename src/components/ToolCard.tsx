import Link from "next/link";
import { type LucideIcon } from "lucide-react";

interface ToolCardProps {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

export default function ToolCard({ title, description, href, icon: Icon }: ToolCardProps) {
  return (
    <Link 
      href={href}
      className="group flex flex-col items-center text-center p-6 bg-white border border-gray-100 rounded-xl hover:border-primary hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
    >
      <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary transition-all duration-300">
        <Icon className="w-8 h-8 text-primary group-hover:text-white transition-colors duration-300" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-primary transition-colors">
        {title}
      </h3>
      <p className="text-sm text-gray-500">
        {description}
      </p>
    </Link>
  );
}
