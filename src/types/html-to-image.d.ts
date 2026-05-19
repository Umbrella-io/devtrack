declare module "html-to-image" {
  export interface Options {
    width?: number;
    height?: number;
    pixelRatio?: number;
    style?: Partial<CSSStyleDeclaration>;
    cacheBust?: boolean;
    backgroundColor?: string;
  }

  export function toPng(node: HTMLElement, options?: Options): Promise<string>;
}
