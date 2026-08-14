export interface MobileSurfaceCapabilities {
  canSubmitIntent: true;
  canApproveActions: true;
  canReadRedactedEvents: true;
  canReadArtifactSummary: true;
  canReadSecrets: false;
}

export const mobileSurfaceCapabilities: MobileSurfaceCapabilities = {
  canSubmitIntent: true,
  canApproveActions: true,
  canReadRedactedEvents: true,
  canReadArtifactSummary: true,
  canReadSecrets: false
};
