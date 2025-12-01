import * as OpenCC from 'opencc-js';

// Initialize converters
// CN = Simplified, TW = Traditional (Taiwan standard is common for learner materials)
const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });

export const convertHanzi = (text: string, toTraditional: boolean): string => {
  if (!text) return '';
  return toTraditional ? converter(text) : text;
};

