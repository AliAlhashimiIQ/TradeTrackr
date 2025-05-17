'use client';

import dynamic from 'next/dynamic';

// Dynamically import the NetworkStatus component in this client component
const NetworkStatus = dynamic(() => import('./NetworkStatus').then(mod => mod.NetworkStatus), { 
  ssr: false 
});

export default function ClientNetworkWrapper() {
  return <NetworkStatus />;
} 