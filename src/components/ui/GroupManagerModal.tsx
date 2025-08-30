import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Folder, File, Archive, FileText, Image, Volume2, Music } from 'lucide-react';
import { GrpArchive, GrpEntry } from '../../modules/grp/grpParser';
import { FileManager } from '../../modules/app/FileManager';
import { AppController } from '../../modules/app/AppController';
import { analyzeGrp, formatBytes, GrpInfo } from '../../modules/grp/grpAnalyzer';

interface GroupManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  grp: { arc: GrpArchive; name: string } | null;
  fileManager: FileManager | null;
  appController: AppController | null;
  onStatusChange: (status: string) => void;
}

export function GroupManagerModal({
  isOpen,
  onClose,
  grp,
  fileManager,
  appController,
  onStatusChange
}: GroupManagerModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'explorer'>('info');

  const handleTryBuiltin = async () => {
    if (!fileManager || !appController) return;
    
    try {
      onStatusChange('Fetching /DUKE3D.GRP …');
      const buf = await fileManager.fetchBuiltinGrp();
      const arc = await fileManager.loadGrpFromBuffer(buf);
      appController.setCurrentGrp(arc, 'DUKE3D.GRP');
      onStatusChange(`Loaded GRP: DUKE3D.GRP — files: ${arc.count}`);
    } catch (e: any) {
      onStatusChange('Could not fetch built-in GRP. Place it in /public.');
      console.warn(e);
    }
  };

  const handleLoadMap = async (entry: GrpEntry) => {
    if (!grp || !fileManager || !appController) return;
    
    onStatusChange(`Loading ${entry.name} from ${grp.name} …`);
    try {
      const map = await fileManager.loadMapFromGrpEntry(grp.arc, entry);
      appController.setCurrentMap(map);
      onStatusChange(
        `Loaded: ${entry.name} — sectors: ${map.sectors.length}, ` +
        `walls: ${map.walls.length}, sprites: ${map.sprites.length}`
      );
      onClose();
    } catch (err: any) {
      console.error(err);
      onStatusChange(`Failed to load: ${err?.message ?? 'Unknown error'}`);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'map': return <FileText size={14} />;
      case 'art': case 'pcx': case 'bmp': return <Image size={14} />;
      case 'voc': case 'wav': return <Volume2 size={14} />;
      case 'mid': case 'ogg': return <Music size={14} />;
      default: return <File size={14} />;
    }
  };

  const renderInfoTab = () => {
    if (!grp) return null;
    
    let info: GrpInfo;
    try {
      info = analyzeGrp(grp.arc, grp.name);
    } catch (error) {
      console.error('Error analyzing GRP:', error);
      return <div className="info-section">Error analyzing GRP file</div>;
    }
    
    if (!info) return <div className="info-section">No GRP information available</div>;

    return (
      <div className="grp-info-grid">
        {/* Basic Info */}
        <div className="info-section">
          <h3>File Details</h3>
          <div className="info-row">
            <span className="info-label">Filename:</span>
            <span className="info-value">{info.filename}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Signature:</span>
            <span className="info-value">{info.signature}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Total Size:</span>
            <span className="info-value">{formatBytes(info.totalSize)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">File Count:</span>
            <span className="info-value">{info.fileCount}</span>
          </div>
        </div>

        {/* Game Detection */}
        {info.detectedGame && (
          <div className="info-section">
            <h3>Game Detection</h3>
            <div className="info-row">
              <span className="info-label">Game:</span>
              <span className="info-value game-name">{info.detectedGame}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Confidence:</span>
              <span className="info-value">{Math.round(info.confidence * 100)}%</span>
            </div>
          </div>
        )}

        {/* File Statistics */}
        <div className="info-section full-width">
          <h3>File Statistics</h3>
          <div className="file-stats">
            {info.fileTypes && Object.entries(info.fileTypes).map(([type, count]) => (
              <div key={type} className="stat-item">
                <span className="stat-label">{type}:</span>
                <span className="stat-value">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Common Files */}
        <div className="info-section full-width">
          <h3>Notable Files</h3>
          <div className="common-files">
            {info.commonFiles && info.commonFiles.map(filename => (
              <span key={filename} className="file-tag">{filename}</span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderExplorerTab = () => {
    if (!grp) {
      return (
        <div className="grp-empty">
          <p>No GRP file loaded.</p>
          <button className="btn btn-primary" onClick={handleTryBuiltin}>
            Try Built-in DUKE3D.GRP
          </button>
        </div>
      );
    }

    const { arc, name } = grp;
    const maps = arc.entries.filter(e => e.name.toLowerCase().endsWith('.map'));
    const otherFiles = arc.entries.filter(e => !e.name.toLowerCase().endsWith('.map'));

    return (
      <>
        <div className="grp-meta">
          <strong>{name}</strong> — {arc.count} files
        </div>

        <div className="grp-list">
          {maps.length > 0 && (
            <div className="grp-section">
              <h3 className="section-title">Maps ({maps.length})</h3>
              {maps.map((entry, i) => (
                <div 
                  key={i} 
                  className="list-row clickable" 
                  onClick={() => handleLoadMap(entry)}
                >
                  <div className="file-info">
                    {getFileIcon(entry.name)}
                    <span className="file-name">{entry.name}</span>
                  </div>
                  <span className="file-size">{formatBytes(entry.size)}</span>
                </div>
              ))}
            </div>
          )}

          {otherFiles.length > 0 && (
            <div className="grp-section">
              <h3 className="section-title">Other Files ({otherFiles.length})</h3>
              {otherFiles.slice(0, 20).map((entry, i) => (
                <div key={i} className="list-row">
                  <div className="file-info">
                    {getFileIcon(entry.name)}
                    <span className="file-name">{entry.name}</span>
                  </div>
                  <span className="file-size">{formatBytes(entry.size)}</span>
                </div>
              ))}
              {otherFiles.length > 20 && (
                <div className="list-row">
                  <span className="file-name">... and {otherFiles.length - 20} more files</span>
                </div>
              )}
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal-content grp-modal">
          <div className="modal-header">
            <Dialog.Title className="modal-title">
              <Archive size={20} />
              Group File Manager
            </Dialog.Title>
            <Dialog.Close className="modal-close-btn">
              <X size={16} />
            </Dialog.Close>
          </div>

          {/* Tab Navigation */}
          <div className="modal-tabs">
            <button 
              className={`tab-button ${activeTab === 'info' ? 'active' : ''}`}
              onClick={() => setActiveTab('info')}
            >
              Information
            </button>
            <button 
              className={`tab-button ${activeTab === 'explorer' ? 'active' : ''}`}
              onClick={() => setActiveTab('explorer')}
            >
              Explorer
            </button>
          </div>

          <div className="modal-body">
            {activeTab === 'info' && renderInfoTab()}
            {activeTab === 'explorer' && renderExplorerTab()}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}