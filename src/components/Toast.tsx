"use client";

import { useEffect } from "react";

interface ToastProps {
    message: string;
    onClose: () => void;
}

export default function Toast({ message, onClose }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);

        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed inset-0 flex justify-center items-start pt-6 pointer-events-none z-50">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-5 py-3 shadow-lg animate-bounce">
                <p className="text-sm font-medium text-[var(--card-foreground)]">
                    {message}
                </p>
            </div>
        </div>
    );
}