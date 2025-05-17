import { aiServiceConfig } from '../aiConfig';

const isDevelopment = process.env.NODE_ENV === 'development';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const logger = {
  debug: (message: string, ...args: any[]) => {
    if (isDevelopment || aiServiceConfig.options.debugMode) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },
  
  info: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },
  
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },
  
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error);
  }
};

export default logger; 