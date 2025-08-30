import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, FileText, Image, Volume2, Music, Archive } from 'lucide-react';
import { GrpArchive } from '../../modules/grp/grpParser';
import { analyzeGrp, formatBytes, GrpInfo } from '../../modules/grp/grpAnalyzer';

interface GrpInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  grp: { arc: GrpArchive; name: string } | null;
}

export function GrpInfoModal({ isOpen, onClose, grp }: GrpInfoModalProps) {
  if (!grp) return null;
  
  const info: GrpInfo = analyzeGrp(grp.arc, grp.name);
  
  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal-content grp-info-modal">
          <div className="modal-header">
            <Dialog.Title className="modal-title">
              <Archive size={20} />
              GRP File Information
            </Dialog.Title>
            <Dialog.Close className="modal-close-btn">
              <X size={16} />
            </Dialog.Close>
          </div>

          <div className="modal-body">
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
                  <span className="info-label">Total Files:</span>
                  <span className="info-value">{info.totalFiles}</span>
                </div>
                {info.knownGame && (
                  <div className="info-row">
                    <span className="info-label">Detected Game:</span>
                    <span className="info-value game-name">{info.knownGame}</span>
                  </div>
                )}
              </div>

              {/* File Breakdown */}
              <div className="info-section">
                <h3>File Breakdown</h3>
                <div className="file-stats">
                  <div className="stat-item">
                    <FileText size={16} />
                    <span className="stat-label">Maps</span>
                    <span className="stat-value">{info.mapCount}</span>
                  </div>
                  <div className="stat-item">
                    <Image size={16} />
                    <span className="stat-label">Art/Textures</span>
                    <span className="stat-value">{info.artCount}</span>
                  </div>
                  <div className="stat-item">
                    <Volume2 size={16} />
                    <span className="stat-label">Sounds</span>
                    <span className="stat-value">{info.soundCount}</span>
                  </div>
                  <div className="stat-item">
                    <Music size={16} />
                    <span className="stat-label">Music</span>
                    <span className="stat-value">{info.musicCount}</span>
                  </div>
                  <div className="stat-item">
                    <Archive size={16} />
                    <span className="stat-label">Other</span>
                    <span className="stat-value">{info.otherCount}</span>
                  </div>
                </div>
              </div>

              {/* Common Files */}
              {info.hasCommonFiles.length > 0 && (
                <div className="info-section full-width">
                  <h3>Key Files Present</h3>
                  <div className="common-files">
                    {info.hasCommonFiles.map((filename, index) => (
                      <span key={index} className="file-tag">{filename}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}