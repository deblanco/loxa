/**
 * next/font downloads and subsets real font files at build time, which a plain
 * Node test run has no business doing. The layout only needs the class names.
 */
const stub = () => ({ variable: "font-stub", className: "font-stub" });

export const Instrument_Serif = stub;
export const Instrument_Sans = stub;
