// Audio & Haptic feedback helper for barcode scanning and actions
// Note: Sound effects are completely disabled as requested.

class SoundService {
  // Sound disabled - no audio context or beep generated
  public playSuccessBeep() {
    // Audio effects disabled
  }

  public playWarningBeep() {
    // Audio effects disabled
  }

  public playErrorBeep() {
    // Audio effects disabled
  }

  public playCompletionChime() {
    // Audio effects disabled
  }

  public playUndoBeep() {
    // Audio effects disabled
  }
}

export const soundService = new SoundService();

