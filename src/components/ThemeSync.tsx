"use client";

import { useLayoutEffect } from "react";

const STORAGE_KEY = "theme";

export default function ThemeSync() {
	useLayoutEffect(() => {
		const storedTheme = localStorage.getItem(STORAGE_KEY);
		const isDark = storedTheme ? storedTheme === "dark" : true;

		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		localStorage.setItem(STORAGE_KEY, isDark ? "dark" : "light");
	}, []);

	return null;
}
