import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            html, body {
              background: #080808 !important;
              color-scheme: dark;
            }
          `,
        }}
      />
      {children}
    </>
  );
}