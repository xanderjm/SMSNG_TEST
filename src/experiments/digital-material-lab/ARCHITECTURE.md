# Digital Material Lab - Effect System Architecture

## Overview

The effect system provides a unified way to animate any property between two states (contracted and expanded) with full control over timing and easing.

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
  curveStart: number;            // Y value at contracted (0-1 of min-max range)
  curveEnd: number;              // Y value at expanded (0-1 of min-max range)
  curve: [number, number, number, number];  // Bezier control points [x1, y1, x2, y2]
}
```

### How Values Are Calculated

1. **Timeline Window** (`startT` to `endT`): Defines when the effect transitions during expansion
   - Before `startT`: effect stays at `curveStart` value
   - After `endT`: effect stays at `curveEnd` value
   - Between: effect transitions using the bezier curve

2. **Bezier Curve**: The curve controls HOW the effect transitions
   - `curveStart` and `curveEnd` are the Y endpoints of the curve
   - `curve[1]` (y1) and `curve[3]` (y2) are control point Y values
   - Control points can exceed 0-1 range for overshoot effects
   - **Important**: If `curveStart = curveEnd` but control points differ, the curve creates a parabolic effect (peaks in the middle)

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
  curveStart: 0,       // At contracted: use min (0.01)
  curveEnd: 1,         // At expanded: use max (0.15)
  curve: [0.4, 0, 0.2, 1],  // Ease curve
}
```

## Creating a New Effect

### Step 1: Define the Effect in `defaultAnimConfig`

```typescript
const defaultAnimConfig: AnimationConfig = {
  duration: 800,
  curve: [0.34, 1.56, 0.64, 1],
  effects: [
    // Existing effects...
    {
      id: 'myNewEffect',           // Unique ID
      name: 'My New Effect',       // UI display name
      enabled: true,
      min: 0,                      // Minimum value
      max: 1,                      // Maximum value
      startT: 0,                   // Timeline start
      endT: 1,                     // Timeline end
      curveStart: 0,               // Value at contracted (0 = min)
      curveEnd: 1,                 // Value at expanded (1 = max)
      curve: [0.4, 0, 0.2, 1],     // Easing curve
    },
  ],
};
```

### Step 2: Calculate the Effect Value in Render Loop

```typescript
// In the render loop:
const myEffect = animConfig.effects.find(e => e.id === 'myNewEffect');
const myEffectValue = myEffect
  ? calculateEffectValue(myEffect, expansionProgress)
  : defaultValue;

// Apply clamping if needed (e.g., corner radius can't exceed half the shortest edge)
const clampedValue = Math.min(myEffectValue, maxAllowedValue);

// Use in shader or geometry
setUniform1f('u_myEffect', clampedValue);
```

### Step 3: Add UI Controls in SettingsPanel

The `EffectEditor` component automatically handles all effects. Just ensure the effect is rendered:

```typescript
const myEffect = animConfig.effects.find(e => e.id === 'myNewEffect');
{myEffect && (
  <EffectEditor
    effect={myEffect}
    onChange={(effect) => updateEffect('myNewEffect', effect)}
  />
)}
```

## UI Controls Explained

### Effect Range (Min/Max)
- Defines the absolute bounds of the effect
- The curve operates within this range

### State Values Display
- **Contracted**: The actual value when `expansionProgress = 0`
- **Expanded**: The actual value when `expansionProgress = 1`
- Calculated as: `min + (max - min) * curveStart/curveEnd`

### Timeline Position
- **Start**: When the effect begins transitioning (% of expansion)
- **End**: When the effect finishes transitioning (% of expansion)
- Example: `startT=0.2, endT=0.8` means effect transitions between 20% and 80% expanded

### Motion Curve
- **Green point**: Contracted value (Y position in 0-1 range)
- **Red point**: Expanded value (Y position in 0-1 range)
- **Control handles**: Shape of the transition curve
- **Parabolic curves**: Set green and red to same position, but drag handles to create a curve that peaks/dips in the middle

## Curve Types

### Linear (no easing)
```typescript
curve: [0, 0, 1, 1]
```

### Ease (smooth start and end)
```typescript
curve: [0.25, 0.1, 0.25, 1]
```

### Ease Out (fast start, slow end)
```typescript
curve: [0, 0, 0.58, 1]
```

### Elastic (overshoot)
```typescript
curve: [0.34, 1.56, 0.64, 1]
```

### Parabolic (same start/end, peaks in middle)
```typescript
curveStart: 0,
curveEnd: 0,
curve: [0.25, 0.8, 0.75, 0.8],  // Control points at y=0.8 create a peak
```

## Best Practices

1. **Always clamp physical values**: Corner radius should never exceed half the shortest edge
2. **Use meaningful IDs**: Effect IDs should be descriptive and match the property name
3. **Set sensible defaults**: Min/max should cover the useful range without allowing broken states
4. **Consider animation direction**: Effects work the same whether expanding or collapsing

## File Structure

```
digital-material-lab/
├── index.tsx          # Main component, Effect interface, calculateEffectValue
├── animation.ts       # Bezier curves, AnimationController
├── SettingsPanel.tsx  # UI components including EffectEditor
├── BezierCurveEditor.tsx  # Visual curve editor
├── shaders.ts         # GLSL shaders
├── webgl.ts           # WebGL utilities
└── ARCHITECTURE.md    # This file
```
