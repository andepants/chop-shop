/**
 * Types for the canvas-based video compositor system
 *
 * The compositor manages multiple video elements and renders them to a canvas
 * for seamless multi-track playback with frame-accurate seeking.
 */

/**
 * Represents a loaded video source file
 */
export interface VideoSource {
  /** Absolute file path to the video */
  filePath: string
  /** The HTMLVideoElement for this source */
  element: HTMLVideoElement
  /** Whether the video metadata is loaded */
  isLoaded: boolean
  /** Video duration in seconds */
  duration: number
  /** Last time this source was accessed (for LRU caching) */
  lastAccessed: number
}

/**
 * Represents a clip in the compositor timeline
 * Maps timeline clip data to rendering parameters
 */
export interface CompositorClip {
  /** Unique clip identifier */
  id: string
  /** Track this clip belongs to */
  trackId: string
  /** Track index (for z-ordering, higher = on top) */
  trackIndex: number
  /** Absolute file path to source video */
  sourceFile: string
  /** Path to intermediate ProRes file (used for playback) */
  intermediatePath: string
  /** Global timeline start time in seconds */
  startTime: number
  /** Clip duration in timeline (after trim applied) */
  duration: number
  /** Trim from start of source video (seconds) */
  trimIn: number
  /** Trim from end of source video (seconds) */
  trimOut: number
  /** Opacity for compositing (0-1) */
  opacity: number
  /** PiP position for overlay clips (Track 2+) */
  pipPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  /** PiP size as percentage (e.g., 0.25 = 25% of canvas width), clamped to [0.05, 0.5] */
  pipSize?: number
  /** Whether to render border around this clip (default true for trackIndex > 0) */
  showBorder?: boolean
}

/**
 * Represents a track in the compositor
 */
export interface CompositorTrack {
  /** Track identifier */
  id: string
  /** Track index (for z-ordering) */
  index: number
  /** Clips on this track, sorted by startTime */
  clips: CompositorClip[]
}

/**
 * State of the compositor playback
 */
export interface CompositorState {
  /** Current global timeline position in seconds */
  currentTime: number
  /** Whether compositor is actively playing */
  isPlaying: boolean
  /** Total timeline duration in seconds */
  duration: number
  /** Clips currently visible/active at currentTime */
  activeClips: CompositorClip[]
  /** RAF handle for rendering loop */
  rafHandle: number | null
  /** Canvas element being rendered to */
  canvas: HTMLCanvasElement | null
}

/**
 * Options for initializing the compositor
 */
export interface CompositorOptions {
  /** Canvas element to render to */
  canvas: HTMLCanvasElement
  /** Canvas width */
  width: number
  /** Canvas height */
  height: number
  /** Maximum number of video elements to keep in memory */
  maxVideoElements?: number
  /** Whether to preload upcoming clips (seconds ahead) */
  preloadAhead?: number
}

/**
 * Event types emitted by the compositor
 */
export type CompositorEventType =
  | 'play'
  | 'pause'
  | 'timeupdate'
  | 'ended'
  | 'error'
  | 'clipchange'
  | 'sourceloaded'
  | 'sourceerror'

/**
 * Event data for compositor events
 */
export interface CompositorEvent {
  type: CompositorEventType
  currentTime?: number
  duration?: number
  error?: Error
  clipIds?: string[]
  sourceFile?: string
}

/**
 * Callback type for compositor events
 */
export type CompositorEventCallback = (event: CompositorEvent) => void
