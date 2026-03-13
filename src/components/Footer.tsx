import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 mt-12 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between text-center md:text-left">
          <div className="flex justify-center space-x-6 md:order-2">
            <Link href="/" className="text-gray-400 hover:text-gray-500">
              Home
            </Link>
            <Link href="#" className="text-gray-400 hover:text-gray-500">
              About
            </Link>
            <Link href="#" className="text-gray-400 hover:text-gray-500">
              Privacy Policy
            </Link>
          </div>
          <div className="mt-8 md:mt-0 md:order-1">
            <p className="text-center text-base text-gray-400">
              &copy; {new Date().getFullYear()} Free Online Tools. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
