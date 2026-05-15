"use client";

import { useEffect, useRef } from "react";

interface ToastProps {
    message: string;
    onClose: () => void;
}

export default function Toast({
    message,
    onClose,
}: ToastProps) {
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        const timer = setTimeout(() => {
            onCloseRef.current();
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-lg">
            <p className="text-sm font-medium text-[var(--card-foreground)]">
                {message}
            </p>
        </div>
    );
}