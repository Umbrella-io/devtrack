// @ts-nocheck
"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
import React, { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
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
class WidgetErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError(_: Error): State {
    return {
      hasError: true,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Widget crashed:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-[var(--destructive)]/20 bg-[var(--destructive)]/10 p-4 text-center">
          <h2 className="mb-2 text-lg font-semibold">
            Something went wrong
          </h2>

          <p className="mb-4 text-sm text-[var(--muted-foreground)]">
            This widget failed to load.
          </p>

          <button
            onClick={this.handleRetry}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[var(--accent-foreground)] transition hover:opacity-80 transition-all duration-200 hover:opacity-90 active:scale-95"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
}

export default WidgetErrorBoundary;
