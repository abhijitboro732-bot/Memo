# Free Online Tools Website

A modern, fast, and SEO-friendly website containing multiple useful utilities for everyday needs. Built with Next.js 15, React, and Tailwind CSS. The UI features a clean white layout with a distinct blue accent color and placeholder spots for Google AdSense monetization.

## Features

- **Image Tools:** Image Compressor, Resizer, JPG to PNG Converter (100% Client-Side)
- **Text Tools:** Word Counter, Case Converter, Password Generator
- **Calculators:** Age Calculator, Percentage Calculator, BMI Calculator
- **Developer Tools:** JSON Formatter & Validator, Base64 Encoder/Decoder
- **Ads Integration:** AdSense placeholders baked into the layout (under Header, inside Tool pages)
- **SEO Elements:** Custom `sitemap.ts`, `robots.ts`, dynamically updatable metadata, routing conventions.

## Getting Started

### Prerequisites

- Node.js (>= 18.x)
- npm or pnpm setup

### Installation

1. Clone or download the repository.
2. Install the necessary dependencies:

```bash
npm install
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deployment on Vercel

This project is built using Next.js, meaning the easiest and recommended way to deploy is through [Vercel](https://vercel.com/new).

1. Push this code to a GitHub repository.
2. Sign in to Vercel and Import Project.
3. Keep default build settings (`npm run build`).
4. Click Deploy. Your website will be live with an SSL certificate automatically!

Alternatively, you can deploy on any static or Node.js capable host (like Netlify, Render, AWS, etc.) by using Next.js build commands:
```bash
npm run build
npm run start
```

## Adding Real Google AdSense

To enable real ads:
1. Open `src/app/layout.tsx` and replace the placeholder `div` below `<Header />` with your AdSense `<ins class="adsbygoogle" ...>` tag.
2. Open `src/components/ToolLayout.tsx` and replace the inside-tool placeholder with your AdSense container.
3. Don't forget to include the `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXX" crossOrigin="anonymous"></script>` inside the `<head>` of your `layout.tsx`.
