"use client";

import { Theme, themes } from "@/lib/themes";
import { useTheme } from "./ThemeContext";

export default function ThemePresetPicker() {
    const { theme, setTheme } = useTheme();

    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Object.entries(themes).map(([themeKey, config]) => {
                const isActive = theme === themeKey;

                return (
                    <button
                        key={themeKey}
                        type="button"
                        onClick={() => setTheme(themeKey as Theme)}
                        className={`group rounded-2xl border p-4 text-left transition-colors duration-300 ${isActive
                            ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-[var(--shadow-soft)]"
                            : "border-[var(--border)] bg-[var(--card)] hover:bg-[var(--control)]"
                            }`}
                        aria-pressed={isActive}
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-semibold text-[var(--card-foreground)]">
                                    {config.label}
                                </h4>

                                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                                    {config.mode === "dark" ? "Dark Theme" : "Light Theme"}
                                </p>
                            </div>

                            {isActive && (
                                <div className="rounded-full bg-[var(--accent)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-foreground)]">
                                    Active
                                </div>
                            )}
                        </div>

                        <div
                            className="overflow-hidden rounded-xl border border-black/10"
                            style={{
                                backgroundColor: config.preview.background,
                            }}
                        >
                            <div className="space-y-2 p-3">
                                <div
                                    className="h-3 w-2/3 rounded-md"
                                    style={{
                                        backgroundColor: config.preview.card,
                                    }}
                                />

                                <div
                                    className="h-3 w-1/2 rounded-md"
                                    style={{
                                        backgroundColor: config.preview.card,
                                    }}
                                />

                                <div className="flex gap-2 pt-2">
                                    <div
                                        className="h-8 flex-1 rounded-lg"
                                        style={{
                                            backgroundColor: config.preview.card,
                                        }}
                                    />

                                    <div
                                        className="h-8 w-10 rounded-lg"
                                        style={{
                                            backgroundColor: config.preview.accent,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}