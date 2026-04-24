"use client";
import Link from 'next/link';

export default function Error() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
      <h1 className="text-5xl font-bold mb-4">500 - Server Error</h1>
      <p className="mb-8 text-lg">Oops! Something went wrong. Please try again later.</p>
      <Link href="/" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">Go Home</Link>
    </div>
  );
} 
