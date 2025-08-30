import React from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { SelectionInfo, getObjectInfo } from '../../types/selection';

interface InspectorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectionInfo: SelectionInfo | null;
  onResize?: () => void;
}

export function InspectorPanel({ isOpen, onClose, selectionInfo, onResize }: InspectorPanelProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [height, setHeight] = React.useState(200);
  const [isResizing, setIsResizing] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);

  // Handle resize functionality
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const container = panelRef.current?.parentElement;
      if (!container) return;
      
      const containerRect = container.getBoundingClientRect();
      const newHeight = containerRect.bottom - e.clientY;
      const minHeight = 40;
      const maxHeight = containerRect.height - 100; // Leave space for menu/status
      
      const adjustedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
      setHeight(adjustedHeight);
      onResize?.();
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  if (!isOpen || !selectionInfo) return null;

  const renderObjectInfo = () => {
    if (selectionInfo.type === 'multiple') {
      return (
        <div className="inspector-content">
          <div className="inspector-header">
            <h3>Multiple Objects Selected ({selectionInfo.indices.length})</h3>
            <div className="inspector-actions">
              <button 
                className="inspector-btn"
                onClick={() => setIsCollapsed(!isCollapsed)}
                title={isCollapsed ? 'Expand' : 'Collapse'}
              >
                {isCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              <button className="inspector-btn" onClick={onClose} title="Close">
                <X size={16} />
              </button>
            </div>
          </div>
          {!isCollapsed && (
            <div className="multi-selection-list">
              {selectionInfo.indices.map((index, i) => (
                <div key={i} className="multi-item">
                  <span className="item-type">{selectionInfo.type}</span>
                  <span className="item-id">#{index}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    const index = selectionInfo.indices[0];
    const obj = getObjectInfo(selectionInfo.map, selectionInfo.type, index);
    
    
    if (!obj) return <div>No object selected</div>;

    return (
      <div className="inspector-content">
        <div className="inspector-header">
          <h3>{obj.type.charAt(0).toUpperCase() + obj.type.slice(1)} #{obj.index}</h3>
          <div className="inspector-actions">
            <button 
              className="inspector-btn"
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? 'Expand' : 'Collapse'}
            >
              {isCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <button className="inspector-btn" onClick={onClose} title="Close">
              <X size={16} />
            </button>
          </div>
        </div>
        
        {!isCollapsed && (
          <div className="inspector-properties">
            {obj.type === 'wall' && renderWallProperties(obj)}
            {obj.type === 'sector' && renderSectorProperties(obj)}
            {obj.type === 'sprite' && renderSpriteProperties(obj)}
          </div>
        )}
      </div>
    );
  };

  const renderWallProperties = (wall: any) => (
    <div className="properties-grid">
      <div className="property-section">
        <h4>Position</h4>
        <div className="property-row">
          <span className="prop-label">X:</span>
          <span className="prop-value">{wall.x}</span>
        </div>
        <div className="property-row">
          <span className="prop-label">Y:</span>
          <span className="prop-value">{wall.y}</span>
        </div>
        <div className="property-row">
          <span className="prop-label">Point2:</span>
          <span className="prop-value">#{wall.point2}</span>
        </div>
      </div>

      <div className="property-section">
        <h4>Connection</h4>
        <div className="property-row">
          <span className="prop-label">Next Wall:</span>
          <span className="prop-value">{wall.nextwall >= 0 ? `#${wall.nextwall}` : 'None'}</span>
        </div>
        <div className="property-row">
          <span className="prop-label">Next Sector:</span>
          <span className="prop-value">{wall.nextsector >= 0 ? `#${wall.nextsector}` : 'None'}</span>
        </div>
      </div>

      <div className="property-section">
        <h4>Appearance</h4>
        <div className="property-row">
          <span className="prop-label">Texture:</span>
          <span className="prop-value">#{wall.picnum}</span>
        </div>
        <div className="property-row">
          <span className="prop-label">Over Texture:</span>
          <span className="prop-value">#{wall.overpicnum}</span>
        </div>
        <div className="property-row">
          <span className="prop-label">Shade:</span>
          <span className="prop-value">{wall.shade}</span>
        </div>
        <div className="property-row">
          <span className="prop-label">Palette:</span>
          <span className="prop-value">{wall.pal}</span>
        </div>
      </div>

      <div className="property-section">
        <h4>Scaling</h4>
        <div className="property-row">
          <span className="prop-label">X Repeat:</span>
          <span className="prop-value">{wall.xrepeat}</span>
        </div>
        <div className="property-row">
          <span className="prop-label">Y Repeat:</span>
          <span className="prop-value">{wall.yrepeat}</span>
        </div>
        <div className="property-row">
          <span className="prop-label">X Panning:</span>
          <span className="prop-value">{wall.xpanning}</span>
        </div>
        <div className="property-row">
          <span className="prop-label">Y Panning:</span>
          <span className="prop-value">{wall.ypanning}</span>
        </div>
      </div>

      <div className="property-section">
        <h4>Tags & Status</h4>
        <div className="property-row">
          <span className="prop-label">Lo Tag:</span>
          <span className="prop-value">{wall.lotag}</span>
        </div>
        <div className="property-row">
          <span className="prop-label">Hi Tag:</span>
          <span className="prop-value">{wall.hitag}</span>
        </div>
        <div className="property-row">
          <span className="prop-label">CStatus:</span>
          <span className="prop-value">{wall.cstat} (0x{wall.cstat.toString(16).toUpperCase()})</span>
        </div>
      </div>
    </div>
  );

  const renderSectorProperties = (sector: any) => (
    <div className="properties-grid">
      <div className="property-section">
        <h4>Structure</h4>
        <div className="property-row">
          <span className="prop-label">Wall Pointer:</span>
          <span className="prop-value">{sector.wallptr}</span>
        </div>
        <div className="property-row">
          <span className="prop-label">Wall Count:</span>
          <span className="prop-value">{sector.wallnum}</span>
        </div>
      </div>

      <div className="property-section">
        <h4>Heights</h4>
        <div className="property-row">
          <span className="prop-label">Floor Z:</span>
          <span className="prop-value">{sector.floorz}</span>
        </div>
        <div className="property-row">
          <span className="prop-label">Ceiling Z:</span>
          <span className="prop-value">{sector.ceilingz}</span>
        </div>
        <div className="property-row">
          <span className="prop-label">Floor Slope:</span>
          <span className="prop-value">{sector.floorheinum}</span>
        </div>
        <div className="property-row">
          <span className="prop-label">Ceiling Slope:</span>
          <span className="prop-value">{sector.ceilingheinum}</span>
        </div>
      </div>

      <div className="property-section">
        <h4>Floor</h4>
        <div className="property-row">
          <span className="prop-label">Texture:</span>
          <span className="prop-value">#{sector.floorpicnum}</span>
        </div>
        <div className="property-row">
          <span className="prop-label">Shade:</span>
          <span className="prop-value">{sector.floorshade}</span>
        </div>
        <div className="property-row">
          <span className="prop-label">Palette:</span>
          <span className="prop-value">{sector.floorpal}</span>
        </div>
        <div className="property-row">
          <span className="prop-label">Status:</span>
          <span className="prop-value">{sector.floorstat}</span>
        </div>
      </div>

      <div className="property-section">
        <h4>Ceiling</h4>
        <div className="property-row">
          <span className="prop-label">Texture:</span>
          <span className="prop-value">#{sector.ceilingpicnum}</span>
        </div>
        <div className="property-row">
          <span className="prop-label">Shade:</span>
          <span className="prop-value">{sector.ceilingshade}</span>
        </div>
        <div className="property-row">
          <span className="prop-label">Palette:</span>
          <span className="prop-value">{sector.ceilingpal}</span>
        </div>
        <div className="property-row">
          <span className="prop-label">Status:</span>
          <span className="prop-value">{sector.ceilingstat}</span>
        </div>
      </div>

      <div className="property-section">
        <h4>Tags & Properties</h4>
        <div className="property-row">
          <span className="prop-label">Lo Tag:</span>
          <span className="prop-value">{sector.lotag}</span>
        </div>
        <div className="property-row">
          <span className="prop-label">Hi Tag:</span>
          <span className="prop-value">{sector.hitag}</span>
        </div>
        <div className="property-row">
          <span className="prop-label">Visibility:</span>
          <span className="prop-value">{sector.visibility}</span>
        </div>
      </div>
    </div>
  );

  const renderSpriteProperties = (sprite: any) => (
    <div className="properties-grid">
      <div className="property-section">
        <h4>Position</h4>
        <div className="property-row">
          <span className="prop-label">X:</span>
          <span className="prop-value">{sprite.x}</span>
        </div>
        <div className="property-row">
          <span className="prop-label">Y:</span>
          <span className="prop-value">{sprite.y}</span>
        </div>
        <div className="property-row">
          <span className="prop-label">Z:</span>
          <span className="prop-value">{sprite.z}</span>
        </div>
        <div className="property-row">
          <span className="prop-label">Sector:</span>
          <span className="prop-value">#{sprite.sectnum}</span>
        </div>
      </div>

      <div className="property-section">
        <h4>Orientation</h4>
        <div className="property-row">
          <span className="prop-label">Angle:</span>
          <span className="prop-value">{sprite.ang}° ({Math.round((sprite.ang * 360) / 2048)}°)</span>
        </div>
        <div className="property-row">
          <span className="prop-label">CStatus:</span>
          <span className="prop-value">{sprite.cstat} (0x{sprite.cstat.toString(16).toUpperCase()})</span>
        </div>
      </div>

      <div className="property-section">
        <h4>Appearance</h4>
        <div className="property-row">
          <span className="prop-label">Texture:</span>
          <span className="prop-value">#{sprite.picnum}</span>
        </div>
        <div className="property-row">
          <span className="prop-label">Shade:</span>
          <span className="prop-value">{sprite.shade}</span>
        </div>
        <div className="property-row">
          <span className="prop-label">Palette:</span>
          <span className="prop-value">{sprite.pal}</span>
        </div>
      </div>

      <div className="property-section">
        <h4>Scaling</h4>
        <div className="property-row">
          <span className="prop-label">X Repeat:</span>
          <span className="prop-value">{sprite.xrepeat}</span>
        </div>
        <div className="property-row">
          <span className="prop-label">Y Repeat:</span>
          <span className="prop-value">{sprite.yrepeat}</span>
        </div>
        <div className="property-row">
          <span className="prop-label">X Offset:</span>
          <span className="prop-value">{sprite.xoffset}</span>
        </div>
        <div className="property-row">
          <span className="prop-label">Y Offset:</span>
          <span className="prop-value">{sprite.yoffset}</span>
        </div>
      </div>

      <div className="property-section">
        <h4>Tags & Properties</h4>
        <div className="property-row">
          <span className="prop-label">Lo Tag:</span>
          <span className="prop-value">{sprite.lotag}</span>
        </div>
        <div className="property-row">
          <span className="prop-label">Hi Tag:</span>
          <span className="prop-value">{sprite.hitag}</span>
        </div>
        <div className="property-row">
          <span className="prop-label">Owner:</span>
          <span className="prop-value">{sprite.owner}</span>
        </div>
        <div className="property-row">
          <span className="prop-label">Clip Distance:</span>
          <span className="prop-value">{sprite.clipdist}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div 
      ref={panelRef}
      className={`inspector-panel ${isCollapsed ? 'collapsed' : ''}`}
      style={{ height: isCollapsed ? 40 : height }}
    >
      {!isCollapsed && (
        <div 
          className={`inspector-resize-handle ${isResizing ? 'dragging' : ''}`}
          onMouseDown={handleResizeStart}
        />
      )}
      {renderObjectInfo()}
    </div>
  );
}