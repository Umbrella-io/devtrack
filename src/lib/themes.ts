export type Theme =
    | "light"
    | "dark"
    | "dracula"
    | "nord"
    | "catppuccin-mocha"
    | "solarized-dark";

export type ThemeMode = "light" | "dark";

export interface ThemeConfig {
    label: string;
    mode: ThemeMode;
    preview: {
        background: string;
        accent: string;
        card: string;
    };
}

export const themes: Record<Theme, ThemeConfig> = {
    light: {
        label: "Default Light",
        mode: "light",
        preview: {
            background: "#ffffff",
            accent: "#3b82f6",
            card: "#f8fafc",
        },
    },

    dark: {
        label: "Default Dark",
        mode: "dark",
        preview: {
            background: "#0f172a",
            accent: "#60a5fa",
            card: "#1a2538",
        },
    },

    dracula: {
        label: "Dracula",
        mode: "dark",
        preview: {
            background: "#282a36",
            accent: "#bd93f9",
            card: "#343746",
        },
    },

    nord: {
        label: "Nord",
        mode: "dark",
        preview: {
            background: "#2e3440",
            accent: "#88c0d0",
            card: "#3b4252",
        },
    },

    "catppuccin-mocha": {
        label: "Catppuccin Mocha",
        mode: "dark",
        preview: {
            background: "#1e1e2e",
            accent: "#f5c2e7",
            card: "#313244",
        },
    },

    "solarized-dark": {
        label: "Solarized Dark",
        mode: "dark",
        preview: {
            background: "#002b36",
            accent: "#b58900",
            card: "#073642",
        },
    },
};