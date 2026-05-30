"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
}

export class WidgetErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("WidgetErrorBoundary caught an error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center rounded-xl border border-[var(--destructive)]/30 bg-[var(--destructive)]/5 p-6 text-center animate-in fade-in duration-500">
          <AlertTriangle className="h-8 w-8 text-[var(--destructive)] mb-3" />
          <p className="text-sm font-medium text-[var(--destructive)] mb-4">
            {this.props.fallbackMessage || "Unable to load widget"}
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 rounded-lg bg-[var(--destructive)] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}