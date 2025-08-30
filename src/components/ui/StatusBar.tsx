import React from 'react';
import { GrpArchive } from '../../modules/grp/grpParser';

interface StatusBarProps {
  status: string;
  currentGrp: { arc: GrpArchive; name: string } | null;
  onGrpClick?: () => void;
}

export function StatusBar({ status, currentGrp, onGrpClick }: StatusBarProps) {
  return (
    <div className="status-bar">
      <span className="status-text">{status}</span>
      <div className="status-spacer"></div>
      <span 
        className={`status-grp ${currentGrp ? 'clickable' : ''}`}
        onClick={currentGrp ? onGrpClick : undefined}
        title={currentGrp ? 'Click for GRP file information' : undefined}
      >
        {currentGrp ? `GRP: ${currentGrp.name} (${currentGrp.arc.count} files)` : 'No GRP loaded'}
      </span>
    </div>
  );
}