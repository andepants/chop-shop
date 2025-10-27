# Story 2.5: Video Preview Player and Playback Controls

Status: ready-for-dev

## Story

As a content creator,
I want to play timeline content in the preview window,
So that I can review my video sequence.

## Acceptance Criteria

1. HTML5 video player renders in center preview area
2. Clicking timeline clip loads it in preview player
3. Play/pause button controls playback
4. Playhead moves along timeline synchronized with playback
5. Preview displays current time and total duration
6. Seeking on timeline updates preview to that timestamp
7. Audio plays synchronized with video during playback

## Tasks / Subtasks

- [ ] Task 1: Create PreviewPlayer component (AC: #1)
  - [ ] Create `PreviewPlayer.tsx` in `src/renderer/components/Preview/`
  - [ ] Render HTML5 `<video>` element in center preview area
  - [ ] Style with Tailwind: full width/height of container, black background
  - [ ] Subscribe to `playbackStore` for current clip and playhead state
  - [ ] Integrate into MainLayout component

- [ ] Task 2: Create playback state store (AC: #2, #3, #4)
  - [ ] Create `playbackStore.ts` in `src/renderer/store/`
  - [ ] Track: `currentClipId`, `isPlaying`, `currentTime`, `duration`
  - [ ] Implement actions: `play()`, `pause()`, `seek(time)`, `loadClip(clipId)`
  - [ ] Sync with `timelineStore.playheadPosition` on time updates
  - [ ] Export store hook: `usePlaybackStore`

- [ ] Task 3: Implement clip loading on timeline click (AC: #2)
  - [ ] Add click handler to `TimelineClip` component
  - [ ] Call `playbackStore.loadClip(clip.id)` on click
  - [ ] Look up clip source file from `timelineStore`
  - [ ] Set video element `src` to file path using `file://` protocol
  - [ ] Set initial `currentTime` based on clip's `trimIn` offset

- [ ] Task 4: Create PlaybackControls component (AC: #3, #5)
  - [ ] Create `PlaybackControls.tsx` in `src/renderer/components/Preview/`
  - [ ] Render play/pause button (toggle icon based on `isPlaying`)
  - [ ] Display current time: `formatTime(currentTime)`
  - [ ] Display total duration: `formatTime(duration)`
  - [ ] Style with Tailwind: centered below video, dark toolbar
  - [ ] Position at bottom of preview area

- [ ] Task 5: Implement play/pause functionality (AC: #3, #7)
  - [ ] Handle play button click → call `playbackStore.play()`
  - [ ] In store action: call `videoElement.play()` and set `isPlaying = true`
  - [ ] Handle pause button click → call `playbackStore.pause()`
  - [ ] In store action: call `videoElement.pause()` and set `isPlaying = false`
  - [ ] Ensure audio plays with video (HTML5 default behavior)

- [ ] Task 6: Synchronize playhead with video playback (AC: #4)
  - [ ] Listen to video element's `timeupdate` event
  - [ ] Update `playbackStore.currentTime` from `video.currentTime`
  - [ ] Update `timelineStore.playheadPosition` based on current clip position
  - [ ] Calculate: `playheadPosition = clip.startTime + (currentTime - trimIn)`
  - [ ] Use `requestAnimationFrame` for smooth playhead movement

- [ ] Task 7: Implement timeline seeking (AC: #6)
  - [ ] Add click handler to `TimelineTrack` component
  - [ ] Calculate clicked time based on mouse X position and zoom level
  - [ ] Call `playbackStore.seek(clickedTime)`
  - [ ] Find clip at that timeline position
  - [ ] Load clip if different from current, seek to offset within clip
  - [ ] Update video element: `video.currentTime = offset`

- [ ] Task 8: Handle playback across multiple clips (AC: #4)
  - [ ] When current clip ends, check for next clip on timeline
  - [ ] If next clip exists, load it and continue playback
  - [ ] If no next clip, stop playback and reset playhead
  - [ ] Listen to video `ended` event to trigger transition

- [ ] Task 9: Handle video loading states (AC: #1)
  - [ ] Show loading spinner while video loads
  - [ ] Listen to `loadedmetadata` event to hide spinner
  - [ ] Handle `error` event with user-friendly message
  - [ ] Display "No clip selected" when timeline is empty

- [ ] Task 10: Write unit tests
  - [ ] Test PreviewPlayer renders video element
  - [ ] Test playbackStore.play() and pause() update state
  - [ ] Test playhead synchronization logic
  - [ ] Test seek functionality calculates correct time and clip
  - [ ] Test multi-clip playback transitions

## Dev Notes

### Technical Implementation

**Playback Store Structure:**

```typescript
interface PlaybackState {
  currentClipId: string | null
  isPlaying: boolean
  currentTime: number // Current playback time within clip
  duration: number // Duration of current clip
  videoElement: HTMLVideoElement | null

  loadClip: (clipId: string) => void
  play: () => void
  pause: () => void
  seek: (time: number) => void
  setCurrentTime: (time: number) => void
}
```

**Video Element Integration:**

```tsx
export function PreviewPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const currentClipId = usePlaybackStore((state) => state.currentClipId)
  const isPlaying = usePlaybackStore((state) => state.isPlaying)

  useEffect(() => {
    if (videoRef.current) {
      playbackStore.getState().videoElement = videoRef.current
    }
  }, [])

  useEffect(() => {
    if (currentClipId) {
      const clip = timelineStore.getState().tracks[0].clips.find((c) => c.id === currentClipId)
      if (clip && videoRef.current) {
        videoRef.current.src = `file://${clip.sourceFile}`
        videoRef.current.currentTime = clip.trimIn
      }
    }
  }, [currentClipId])

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-black">
      <video
        ref={videoRef}
        className="max-w-full max-h-full"
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={handleLoaded}
      />
      <PlaybackControls />
    </div>
  )
}
```

**Time Synchronization Logic:**

```typescript
function handleTimeUpdate(e: Event) {
  const video = e.target as HTMLVideoElement
  const currentClip = getCurrentClip()

  if (currentClip) {
    playbackStore.getState().setCurrentTime(video.currentTime)

    // Update timeline playhead position
    const timelinePosition = currentClip.startTime + (video.currentTime - currentClip.trimIn)
    timelineStore.getState().setPlayhead(timelinePosition)
  }
}
```

**Timeline Seeking:**

```typescript
function handleTimelineClick(e: MouseEvent) {
  const rect = timelineRef.current.getBoundingClientRect()
  const clickX = e.clientX - rect.left
  const clickedTime = clickX / zoomLevel

  // Find clip at this timeline position
  const clip = findClipAtTime(clickedTime)

  if (clip) {
    playbackStore.getState().loadClip(clip.id)

    // Calculate offset within clip
    const offsetInClip = clickedTime - clip.startTime
    playbackStore.getState().seek(clip.trimIn + offsetInClip)
  }
}
```

**Multi-Clip Playback:**

```typescript
function handleEnded() {
  const currentClip = getCurrentClip()
  const allClips = timelineStore
    .getState()
    .tracks[0].clips.sort((a, b) => a.startTime - b.startTime)
  const currentIndex = allClips.findIndex((c) => c.id === currentClip?.id)

  if (currentIndex >= 0 && currentIndex < allClips.length - 1) {
    // Load next clip
    const nextClip = allClips[currentIndex + 1]
    playbackStore.getState().loadClip(nextClip.id)
    playbackStore.getState().play()
  } else {
    // End of timeline
    playbackStore.getState().pause()
    timelineStore.getState().setPlayhead(0)
  }
}
```

**Playback Controls UI:**

```tsx
export function PlaybackControls() {
  const isPlaying = usePlaybackStore((state) => state.isPlaying)
  const currentTime = usePlaybackStore((state) => state.currentTime)
  const duration = usePlaybackStore((state) => state.duration)
  const { play, pause } = usePlaybackStore()

  return (
    <div className="flex items-center gap-4 p-4 bg-zinc-900 w-full">
      <button
        onClick={isPlaying ? pause : play}
        className="w-10 h-10 rounded-full bg-cyan-500 hover:bg-cyan-600 flex items-center justify-center"
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>

      <div className="text-sm text-zinc-300">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>
    </div>
  )
}
```

**State Management:**

- `playbackStore`: manages video playback state, current clip, time
- `timelineStore`: updated by playback for playhead position
- Video element stored in playback store for direct control

**File Protocol:**

- Electron allows `file://` protocol for local video files
- Video src set to absolute path: `file:///Users/user/video.mp4`
- No IPC needed for playback (renderer handles directly)

### Project Structure Notes

**New Files to Create:**

```
src/renderer/components/Preview/
  ├── PreviewPlayer.tsx               # Main video player
  ├── PlaybackControls.tsx            # Play/pause and time display
  ├── preview.types.ts                # Preview-specific types
  └── index.ts                        # Exports

src/renderer/store/
  └── playbackStore.ts                # Playback state management
```

**Files Modified:**

```
src/renderer/components/Layout/
  └── MainLayout.tsx                  # Integrate PreviewPlayer in center

src/renderer/components/Timeline/
  ├── Timeline.tsx                    # Add click handler for seeking
  └── TimelineClip.tsx                # Add click handler to load clip
```

**Component Hierarchy:**

```
PreviewPlayer
  ├── <video> element
  └── PlaybackControls
        ├── Play/Pause Button
        └── Time Display
```

**Alignment with Architecture:**

- HTML5 video player (hardware accelerated, meets 30fps NFR)
- Zustand for `playbackStore` state management
- Direct video element control (no IPC overhead)
- Time synchronization via `timeupdate` event
- Single-track playback (multi-track compositing in Story 4.7)

**Performance Considerations:**

- HTML5 video hardware accelerated by default
- `requestAnimationFrame` for smooth playhead updates
- Minimal state updates (only on time change)
- Meets 30fps playback requirement (NFR003)

**Testing Strategy:**

- Unit tests for playbackStore actions
- Unit tests for time synchronization calculations
- Unit tests for multi-clip transition logic
- Manual testing for playback smoothness and audio sync

### References

- [Source: docs/epics.md#Story 2.5] - Acceptance criteria and user story
- [Source: docs/PRD.md#Functional Requirements] - FR006 (video preview), FR007 (playhead sync), FR008 (scrubbing)
- [Source: docs/PRD.md#Non-Functional Requirements] - NFR003 (30fps playback)
- [Source: docs/architecture.md#Technology Stack] - HTML5 Video API usage
- [Source: docs/architecture.md#Data Architecture] - Playback state model
- [Source: docs/architecture.md#Performance Considerations] - Preview rendering
- [Source: Story 2.4] - Timeline integration, playhead component

## Dev Agent Record

### Context Reference

- docs/stories/2-5-video-preview-player-and-playback-controls.context.xml

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

### Completion Notes List

### File List
