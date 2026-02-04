# Digital Material Lab - Effect System Architecture

## Overview

The effect system provides a unified way to animate any property between two states (contracted and expanded) with full control over timing and multi-point curves.

## Core Concepts

### Expansion Progress

All effects are driven by `expansionProgress`, a value from 0 to 1 representing the current state:
- `0` = Fully contracted (pill closed)
- `1` = Fully expanded (pill open)

This is calculated from the master animation progress, accounting for direction:
```typescript
const expansionProgress = isExpanded ? masterProgress : (1 - masterProgress);
```

### Effect Interface

Every effect follows this interface:

```typescript
interface Effect {
  id: string;                    // Unique identifier
  name: string;                  // Display name in UI
  enabled: boolean;              // Toggle on/off
  min: number;                   // Minimum possible value (absolute)
  max: number;                   // Maximum possible value (absolute)
  startT: number;                // When effect starts (0-1 of expansion)
  endT: number;                  // When effect ends (0-1 of expansion)
  curvePoints: CurvePoint[];     // Multi-point curve defining the effect shape
}

interface CurvePoint {
  x: number;  // 0-1 position on timeline
  y: number;  // 0-1 effect value (maps to min-max range)
}
```

### How Values Are Calculated

1. **Timeline Window** (`startT` to `endT`): Defines when the effect transitions during expansion
   - Before `startT`: effect stays at first point's Y value
   - After `endT`: effect stays at last point's Y value
   - Between: effect follows the multi-point curve

2. **Multi-Point Curve**: Uses Catmull-Rom interpolation for smooth curves
   - First point (green) = contracted state value
   - Last point (red) = expanded state value
   - **Double-click** on curve area to add intermediate points
   - **Double-click** on a point to remove it (except start/end)
   - Allows complex curves like parabolas, S-curves, multi-peak effects

3. **Final Value**: `min + (max - min) * curveOutput`

### Example: Corner Roundness Effect

```typescript
{
  id: 'cornerRadius',
  name: 'Corner Roundness',
  enabled: true,
  min: 0.01,           // Minimum corner radius
  max: 0.15,           // Maximum corner radius
  startT: 0,           // Start transitioning immediately
  endT: 1,             // Finish at full expansion
  curvePoints: [
    { x: 0, y: 0 },    // Contracted: min value
    { x: 1, y: 1 },    // Expanded: max value
  ],
}
```

### Parabolic Effect Example

```typescript
{
  id: 'bounce',
  name: 'Bounce Effect',
  enabled: true,
  min: 0,
  max: 1,
  startT: 0,
  endT: 1,
  curvePoints: [
    { x: 0, y: 0 },     // Start at 0
    { x: 0.5, y: 0.8 }, // Peak at 80% in the middle
    { x: 1, y: 0 },     // Return to 0
  ],
}
```

## Creating a New Effect

### Step 1: Define the Effect in `defaultAnimConfig`

```typescript
const defaultAnimConfig: AnimationConfig = {
  duration: 800,
  curve: [0.34, 1.56, 0.64, 1],
  effects: [
    {
      id: 'myNewEffect',
      name: 'My New Effect',
      enabled: true,
      min: 0,
      max: 1,
      startT: 0,
      endT: 1,
      curvePoints: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
    },
  ],
};
```

### Step 2: Calculate the Effect Value in Render Loop

```typescript
const myEffect = animConfig.effects.find(e => e.id === 'myNewEffect');
const myEffectValue = myEffect
  ? calculateEffectValue(myEffect, expansionProgress)
  : defaultValue;

// Apply clamping if needed
const clampedValue = Math.min(myEffectValue, maxAllowedValue);

// Use in shader or geometry
setUniform1f('u_myEffect', clampedValue);
```

### Step 3: Add UI Controls in SettingsPanel

The `EffectEditor` component automatically handles all effects:

```typescript
const myEffect = animConfig.effects.find(e => e.id === 'myNewEffect');
{myEffect && (
  <EffectEditor
    effect={myEffect}
    onChange={(effect) => updateEffect('myNewEffect', effect)}
  />
)}
```

## UI Controls

### Effect Range (Min/Max)
- Defines the absolute bounds of the effect
- Curve Y values (0-1) map to this range

### State Values Display
- **Contracted**: Actual value when `expansionProgress = 0`
- **Expanded**: Actual value when `expansionProgress = 1`

### Timeline Position
- **Start**: When effect begins transitioning
- **End**: When effect finishes transitioning

### Multi-Point Curve Editor
- **Green point**: Start value (fixed at x=0)
- **Red point**: End value (fixed at x=1)
- **Black points**: Intermediate keyframes
- **Double-click empty area**: Add new point
- **Double-click existing point**: Remove point (except endpoints)
- **Drag points**: Adjust position and value

## Curve Types

### Linear (default 2 points)
```typescript
curvePoints: [
  { x: 0, y: 0 },
  { x: 1, y: 1 },
]
```

### Ease In/Out (3 points)
```typescript
curvePoints: [
  { x: 0, y: 0 },
  { x: 0.5, y: 0.5 },
  { x: 1, y: 1 },
]
```

### Parabola (peak in middle)
```typescript
curvePoints: [
  { x: 0, y: 0 },
  { x: 0.5, y: 1 },
  { x: 1, y: 0 },
]
```

### Double Bounce
```typescript
curvePoints: [
  { x: 0, y: 0 },
  { x: 0.25, y: 0.6 },
  { x: 0.5, y: 0.2 },
  { x: 0.75, y: 0.8 },
  { x: 1, y: 1 },
]
```

## Best Practices

1. **Always clamp physical values**: Corner radius shouldn't exceed half the shortest edge
2. **Use meaningful IDs**: Match the property name
3. **Start simple**: Begin with 2 points, add more only if needed
4. **Test both directions**: Effects work the same expanding or collapsing

## File Structure

```
digital-material-lab/
├── index.tsx                 # Main component, Effect interface, calculateEffectValue
├── animation.ts              # Bezier curves for master animation
├── SettingsPanel.tsx         # UI components including EffectEditor
├── MultiPointCurveEditor.tsx # Multi-point curve editor with Catmull-Rom
├── BezierCurveEditor.tsx     # Bezier curve editor for master curve
├── shaders.ts                # GLSL shaders
├── webgl.ts                  # WebGL utilities
└── ARCHITECTURE.md           # This file
```

## Design System

The UI follows a minimal, contemporary aesthetic:
- **Background**: Neutral greys (neutral-50, white)
- **Text**: Dark greys (neutral-600, neutral-800, neutral-900)
- **Borders**: Thin, light (neutral-200)
- **Accents**: Emerald for start/contracted, Rose for end/expanded
- **Interactive elements**: Black fills, white strokes
- **Curves**: Black stroke on white background
