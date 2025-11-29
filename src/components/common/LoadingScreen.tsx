import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-background">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
        <Loader2 size={48} className="text-primary animate-spin relative z-10" />
      </div>
      <p className="mt-6 text-muted-foreground font-medium text-sm tracking-wide animate-pulse">
        Initializing Autonomous Agents...
      </p>
    </div>
  );
};

export default LoadingScreen;
