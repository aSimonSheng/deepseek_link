import type { ArtifactReference } from "@dsh-mobile/protocol";

export function isMobileVisibleArtifact(artifact: ArtifactReference): boolean {
  return artifact.visibility === "mobile_summary" || artifact.visibility === "mobile_redacted";
}
