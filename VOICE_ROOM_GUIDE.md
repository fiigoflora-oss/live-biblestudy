# Voice Room Feature Guide

## Overview
The Voice Room is a live audio discussion space integrated into Study Groups. Members can gather to study scripture together by voice, with a serene UI that matches the app's design language.

## Features

### 1. **Join Voice Room**
- Accessible via the "Voice Room" tab in any Study Group
- Members-only (requires group membership)
- One-click join with graceful microphone permissions handling

### 2. **Live Audio Interface**
- **Live Indicator**: Pulsing red dot with "Live · X in room" header
- **Participant Grid**: 2-column layout on mobile, 4-column on desktop
- **Speaker Detection**: Real microphone input drives audio levels for current user
- **Muted Status**: Visual mute indicator, sample participants animate speaking state

### 3. **Audio Controls**
- **Mute/Unmute Toggle**: Quick toggle button at the bottom
- **Leave Button**: Graceful disconnect with cleanup
- **Visual Feedback**: Buttons change state based on mute status

### 4. **Participant Display**
Each participant tile shows:
- **Avatar**: Circular badge with first letter of name
- **Name**: Truncated text with "(you)" indicator for self
- **Mute Icon**: Shows if participant is muted
- **Wave Bars**: 5-bar audio level indicator
- **Speaking State**: Active speakers get:
  - Primary color background
  - Animated pulse border
  - Brighter wave bars

### 5. **Audio Visualization**
- **Wave Bars**: 5 responsive bars that scale with audio level
- **RMS Calculation**: Real-time audio intensity from user's microphone
- **Smooth Animation**: 150ms transitions for smooth visual response
- **Color Coding**:
  - Active speakers: Primary color (blue)
  - Idle participants: Muted foreground gray

## Technical Implementation

### Architecture
- **Component**: `src/components/voice-room.tsx`
- **Integration**: Tab in `src/routes/_authenticated/groups/$groupId.tsx`
- **Audio**: WebAudio API for real microphone analysis
- **Mock Data**: Sample participants to simulate a real room

### Browser APIs Used
- `navigator.mediaDevices.getUserMedia()` - Microphone access
- `AudioContext` - WebAudio context
- `AnalyserNode` - Real-time frequency analysis
- `requestAnimationFrame` - Smooth wave animation

### State Management
- `connected`: Room connection status
- `muted`: Microphone mute state
- `participants`: Array of participant objects
- `selfLevel`: Real audio level from user's microphone

## Design System Integration

### Theme Colors
- **Primary**: Active speaker indicator, wave bars, badges
- **Accent**: Idle participant avatars
- **Muted**: Disabled state, background elements
- **Foreground**: Text and interactive elements

### Typography
- **Script Font**: Group name, participant names (font-scripture)
- **Sans Font**: UI labels, descriptions

### Spacing & Sizing
- 4px grid for consistent padding
- 2.5rem (40px) participant avatars
- Responsive gaps (3px on mobile, 3px on desktop)

## User Flow

1. **Join Group** → Navigate to group details
2. **Open Voice Room Tab** → See "Join Voice Room" button
3. **Click Join** → Grant microphone permission (optional)
4. **Start Speaking** → See your audio level animate
5. **Manage Session** → Mute/Unmute or Leave anytime
6. **Leave Room** → Automatic cleanup of audio resources

## Future Enhancements

- [ ] LiveKit integration for real peer-to-peer audio
- [ ] Participant list with join/leave notifications
- [ ] Recording capability for discussion replay
- [ ] Screen share for studying together
- [ ] Voice activity detection (auto-mute on silence)
- [ ] Voice moderation tools (volume normalization)
- [ ] Chat alongside voice
- [ ] Scheduled voice sessions

## Accessibility

- ✅ Keyboard accessible buttons
- ✅ ARIA labels on toggle buttons
- ✅ High contrast mode friendly
- ✅ Graceful degradation if audio denied
- ✅ Clear visual state indicators

---

**Current Status**: Fully functional mock implementation with real audio level detection.
**Ready for**: LiveKit integration when API keys are available.
