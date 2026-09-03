/**
 * Drafo Runtime Browser Network & Storage Capabilities Detector
 *
 * Inspects host environment capabilities before transport selection to guarantee
 * graceful degradation across differing browser engines and sandboxes.
 */

export interface NetworkCapabilities {
  webrtc: boolean;
  dataChannel: boolean;
  broadcastChannel: boolean;
  opfs: boolean;
  indexedDb: boolean;
  webCrypto: boolean;
}

let cachedCapabilities: NetworkCapabilities | null = null;

export function detectCapabilities(): NetworkCapabilities {
  if (cachedCapabilities) return cachedCapabilities;

  const isBrowser = typeof window !== 'undefined';

  const hasBroadcastChannel = isBrowser && typeof window.BroadcastChannel === 'function';
  const hasIndexedDB = isBrowser && typeof window.indexedDB !== 'undefined';
  const hasWebCrypto = isBrowser && typeof window.crypto?.subtle !== 'undefined';

  let hasWebRTC = false;
  let hasDataChannel = false;

  if (isBrowser && typeof window.RTCPeerConnection === 'function') {
    hasWebRTC = true;
    try {
      // Test if RTCPeerConnection supports data channel creation
      const pc = new window.RTCPeerConnection({ iceServers: [] });
      const dc = pc.createDataChannel('capability-test', { ordered: true });
      if (dc) {
        hasDataChannel = true;
        dc.close();
      }
      pc.close();
    } catch {
      // In restricted iframes or privacy modes, WebRTC creation may throw
      hasWebRTC = false;
      hasDataChannel = false;
    }
  }

  const hasOPFS =
    isBrowser &&
    typeof navigator !== 'undefined' &&
    typeof navigator.storage?.getDirectory === 'function';

  cachedCapabilities = {
    webrtc: hasWebRTC,
    dataChannel: hasDataChannel,
    broadcastChannel: hasBroadcastChannel,
    opfs: hasOPFS,
    indexedDb: hasIndexedDB,
    webCrypto: hasWebCrypto
  };

  return cachedCapabilities;
}

/**
 * Reset capability cache (useful for mocking during automated testing)
 */
export function resetCapabilityCache(): void {
  cachedCapabilities = null;
}
