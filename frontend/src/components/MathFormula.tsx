import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathFormulaProps {
  latex: string;
  displayMode?: boolean;
  className?: string;
}

export const MathFormula: React.FC<MathFormulaProps> = ({
  latex,
  displayMode = false,
  className = '',
}) => {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        displayMode,
        throwOnError: false,
      });
    } catch {
      return null;
    }
  }, [latex, displayMode]);

  if (!html) {
    return <span className={`font-mono text-xs ${className}`}>{latex}</span>;
  }

  return (
    <span
      className={`katex-wrapper inline-block ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default MathFormula;
