import React from 'react';
import { generateBarcodeSvg } from '../utils/barcode';

interface BarcodeViewProps {
  value: string;
  width?: number | string;
  height?: number;
  showText?: boolean;
  className?: string;
}

export const BarcodeView: React.FC<BarcodeViewProps> = ({
  value,
  width = '100%',
  height = 50,
  showText = true,
  className = '',
}) => {
  const barcode = generateBarcodeSvg(value || '00000000', { height, showText });

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg
        viewBox={barcode.viewBox}
        style={{ width: typeof width === 'number' ? `${width}px` : width, height: `${height}px` }}
        className="overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="crispEdges"
      >
        <rect width="100%" height="100%" fill="white" />
        {barcode.rects.map((rect, idx) => (
          <rect
            key={idx}
            x={rect.x}
            y={2}
            width={rect.width}
            height={barcode.barHeight}
            fill="#000000"
          />
        ))}
        {barcode.showText && (
          <text
            x={barcode.totalWidth / 2}
            y={barcode.barHeight + 13}
            textAnchor="middle"
            fontFamily="monospace"
            fontSize="11"
            letterSpacing="2"
            fill="#111827"
            fontWeight="600"
          >
            {barcode.text}
          </text>
        )}
      </svg>
    </div>
  );
};
