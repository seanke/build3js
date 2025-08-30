import React from 'react';
import { ViewMode } from '../../modules/app/AppController';

interface ViewContainerProps {
  ref2d: React.RefObject<HTMLDivElement>;
  ref3d: React.RefObject<HTMLDivElement>;
  viewMode: ViewMode;
}

export function ViewContainer({ ref2d, ref3d, viewMode }: ViewContainerProps) {
  return (
    <div className="view-container">
      <div 
        ref={ref2d}
        id="view-2d" 
        className={`view-2d ${viewMode === '2d' || viewMode === 'split' ? 'visible' : 'hidden'}`}
        style={{
          width: viewMode === 'split' ? '50%' : '100%',
          height: '100%'
        }}
      />
      <div 
        ref={ref3d}
        id="view-3d" 
        className={`view-3d ${viewMode === '3d' || viewMode === 'split' ? 'visible' : 'hidden'}`}
        style={{
          width: viewMode === 'split' ? '50%' : '100%',
          height: '100%'
        }}
      />
    </div>
  );
}