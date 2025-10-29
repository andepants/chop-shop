/**
 * Timeline type definitions
 *
 * Defines the data structures for timeline clips, tracks, and state management.
 * Clips represent video segments positioned on the timeline, tracks contain clips,
 * and the timeline state manages the overall timeline data and interactions.
 */

/**
 * Represents a video clip placed on the timeline
 */
export interface Clip {
  /** Unique identifier for the clip */
  id: string
  /** Absolute path to the source video file */
  sourceFile: string
  /** Path to intermediate H.264 Intra file (used for playback and editing) */
  intermediatePath: string
  /** Position on timeline in seconds (when the clip starts playing) */
  startTime: number
  /** Total duration of the clip in seconds */
  duration: number
  /** Trim start offset in seconds (default: 0) */
  trimIn: number
  /** Trim end offset in seconds (default: duration) */
  trimOut: number
  /** Which track the clip belongs to (1 for single-track MVP) */
  trackId: number
  /** Optional thumbnail data URL (base64-encoded image) for visual preview */
  thumbnail?: string
  /** PiP position for overlay clips (Track 2+) */
  pipPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  /** PiP size as percentage (e.g., 0.25 = 25% of canvas width) */
  pipSize?: number
  /** Whether the clip has an audio stream (default: true for backwards compatibility) */
  hasAudio?: boolean
  /** Human-readable name for the clip (usually filename without extension) */
  name?: string
  /** Video resolution (width x height) for H.264 level calculation */
  resolution?: { width: number; height: number }
}

/**
 * Represents a timeline track containing clips
 */
export interface Track {
  /** Track identifier (1 = main track, 2 = overlay track) */
  id: number
  /** Array of clips positioned on this track, sorted by startTime */
  clips: Clip[]
  /** Height of track in pixels (default: 80px) */
  height: number
  /** Whether track audio is muted (default: false) */
  isMuted: boolean
  /** Track audio volume level (0.0 = silent, 1.0 = full volume, default: 1.0) */
  volume: number
}

/**
 * Snapshot of timeline state for undo/redo functionality
 */
export interface TimelineSnapshot {
  tracks: Track[]
  playheadPosition: number
  totalDuration: number
  selectedClipIds: string[]
}

/**
 * Timeline state managed by Zustand store
 */
export interface TimelineState {
  /** Array of tracks (2 tracks for multi-track timeline) */
  tracks: Track[]
  /** Current playhead position in seconds */
  playheadPosition: number
  /** Total timeline duration computed from clips */
  totalDuration: number
  /** Zoom level multiplier (0.1 to 5.0, default 1.0) */
  zoomLevel: number
  /** Computed pixels per second based on zoom level */
  pixelsPerSecond: number
  /** Magnetic snap tolerance in seconds (0.1 to 2.0, default 0.5) */
  snapTolerance: number
  /** IDs of currently selected clips (empty array if none selected) */
  selectedClipIds: string[]
  /** History stack for undo/redo (max 50 snapshots) */
  historyStack: TimelineSnapshot[]
  /** Current position in history stack (-1 means no history) */
  historyIndex: number

  // Actions
  /** Add a new clip to the timeline */
  addClip: (clip: Omit<Clip, 'id'>) => void
  /** Add a clip to a specific track (trackId will be set by the function) */
  addClipToTrack: (clip: Omit<Clip, 'id' | 'trackId'>, trackId: number) => void
  /** Get all clips for a specific track */
  getClipsForTrack: (trackId: number) => Clip[]
  /** Remove a clip from the timeline (leaves gaps) */
  removeClip: (clipId: string) => void
  /** Ripple delete: Remove clips and close gaps by shifting remaining clips left */
  rippleDeleteClips: (clipIds: string[]) => void
  /** Update properties of an existing clip */
  updateClip: (clipId: string, updates: Partial<Clip>) => void
  /** Split a clip at a specific time position */
  splitClip: (clipId: string, splitTime: number) => void
  /** Set the playhead position */
  setPlayhead: (position: number) => void
  /** Select a single clip (replaces current selection) */
  selectClip: (clipId: string | null) => void
  /** Toggle a clip in/out of selection (Cmd/Ctrl+click) */
  toggleClipSelection: (clipId: string) => void
  /** Select a range of clips (Shift+click) */
  selectClipRange: (fromClipId: string, toClipId: string) => void
  /** Clear all selections */
  clearSelection: () => void
  /** Move clip to specific timeline position (allows gaps, Premiere Pro style) */
  moveClipToPosition: (clipId: string, targetPosition: number) => void
  /** Reorder clips by moving clip from sourceIndex to destIndex */
  reorderClips: (sourceIndex: number, destIndex: number) => void
  /** Set zoom level with bounds checking (0.1 to 5.0) */
  setZoomLevel: (level: number) => void
  /** Zoom in by 1.2x, max 5.0 */
  zoomIn: () => void
  /** Zoom out by 1.2x, min 0.1 */
  zoomOut: () => void
  /** Calculate zoom level to fit all clips in viewport */
  fitToTimeline: () => void
  /** Set snap tolerance for magnetic snapping (0.1 to 2.0 seconds) */
  setSnapTolerance: (value: number) => void
  /** Undo the last action */
  undo: () => void
  /** Redo the last undone action */
  redo: () => void
  /** Toggle track mute state (for audio muting in export) */
  toggleTrackMute: (trackId: number) => void
  /** Set track volume level (0.0 to 1.0) */
  setTrackVolume: (trackId: number, volume: number) => void
}
