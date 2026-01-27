/**
 * Simple logging service with millisecond timestamps
 */

export enum LogLevel {
  TRACE = "TRACE",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

class LogService {
  /**
   * Get current timestamp with milliseconds
   */
  private getTimestamp(): string {
    const now = new Date();
    return now.toISOString();
  }

  /**
   * Format log message with timestamp and level
   */
  private formatMessage(level: LogLevel, message: string): string {
    return `[${this.getTimestamp()}] [${level}] ${message}`;
  }

  /**
   * Log trace message
   */
  trace(message: string): void {
    console.log(this.formatMessage(LogLevel.TRACE, message));
  }

  /**
   * Log info message
   */
  info(message: string): void {
    console.log(this.formatMessage(LogLevel.INFO, message));
  }

  /**
   * Log warning message
   */
  warn(message: string): void {
    console.warn(this.formatMessage(LogLevel.WARN, message));
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error): void {
    const errorMessage = error ? `${message}: ${error.message}` : message;
    console.error(this.formatMessage(LogLevel.ERROR, errorMessage));
    if (error?.stack) {
      console.error(error.stack);
    }
  }
}

// Export singleton instance
export const logService = new LogService();
