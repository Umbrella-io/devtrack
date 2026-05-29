"use client";

import React, { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

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
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[var(--accent-foreground)] transition hover:opacity-80"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default WidgetErrorBoundary;

