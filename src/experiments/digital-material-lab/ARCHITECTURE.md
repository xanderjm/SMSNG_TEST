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
  curvePoints: CurvePoint[];     // Multi-point bezier curve defining the effect shape
}

interface CurvePoint {
  x: number;  // 0-1 position on timeline
  y: number;  // 0-1 effect value (maps to min-max range)
  // Bezier handle offsets (relative to point position)
  handleIn?: { x: number; y: number };   // Control handle coming in (from left)
  handleOut?: { x: number; y: number };  // Control handle going out (to right)
}
```

**Bezier Handles**: Each point can have two bezier handles to control the curve shape:
- `handleIn`: Controls the curve entering the point (from the previous point)
- `handleOut`: Controls the curve leaving the point (toward the next point)
- Handle `x` is relative to segment width (0 to 1 for out, -1 to 0 for in)
- Handle `y` is absolute offset from point's y value (-1 to 1)

### How Values Are Calculated

1. **Timeline Window** (`startT` to `endT`): Defines when the effect transitions during expansion
   - Before `startT`: effect stays at first point's Y value
   - After `endT`: effect stays at last point's Y value
   - Between: effect follows the multi-point curve

2. **Multi-Point Bezier Curve**: Uses cubic bezier interpolation between points
   - First point (green) = contracted state value
   - Last point (red) = expanded state value
   - Each point has draggable bezier handles (small gray circles) for curve shaping
   - **Double-click** on curve area to add intermediate points
   - **Drag a point outside the editor bounds** to remove it (except start/end)
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
- **Start (green line)**: When effect begins transitioning - drag directly
- **End (red line)**: When effect finishes transitioning - drag directly
- Lines are directly draggable (no separate slider controls)

### Multi-Point Bezier Curve Editor
- **Green point**: Start value (fixed at x=0, Y-axis only)
- **Red point**: End value (fixed at x=1, Y-axis only)
- **White points**: Intermediate keyframes (fully draggable)
- **Gray circles**: Bezier handles for controlling curve shape
- **Double-click empty area**: Add new point with default handles
- **Drag point outside editor bounds**: Remove point (except endpoints, turns red when ready to delete)
- **Drag handles**: Adjust bezier curve shape between points

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
├── animation.ts              # Bezier curves for master animation timing
├── SettingsPanel.tsx         # UI components including EffectEditor, TimelineRange
├── MultiPointCurveEditor.tsx # Multi-point bezier curve editor with handles
├── BezierCurveEditor.tsx     # Bezier curve editor for master timing curve
├── shaders.ts                # GLSL shaders
├── webgl.ts                  # WebGL utilities
└── ARCHITECTURE.md           # This file
```

## Design System

The UI follows a minimal, contemporary dark aesthetic:
- **Background**: Dark greys (neutral-900 for panels, neutral-800 for inputs/editors)
- **Text**: Light greys (neutral-400 for labels, neutral-300 for values, neutral-500 for hints)
- **Borders**: Subtle dark (neutral-700, neutral-800)
- **Accents**: Emerald-500 for start/contracted, Rose-500 for end/expanded
- **Interactive elements**: Light fills (#e5e5e5), dark strokes (#262626)
- **Curves**: Light stroke (#e5e5e5) on dark background (#404040 grid)
- **Section headers**: Text-xs, font-medium, text-neutral-400, uppercase tracking-wide

---

## Reusable Effect System Architecture

The effect system is designed to be reusable across different animated components. This section outlines the architecture for applying effects to buttons, toggles, transforming images, and other UI elements.

### Core Principle: Separation of Concerns

```
┌─────────────────────────────────────────────────────────────────┐
│                         Effect Layer                            │
│  (Effect interface, calculateEffectValue, curve interpolation)  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Animation Layer                           │
│    (AnimationController, master timing, expansion progress)     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Renderer Layer                            │
│        (WebGL, CSS transforms, SVG, Canvas, etc.)               │
└─────────────────────────────────────────────────────────────────┘
```

### Shared Effect Types (to extract to `@/lib/effects/`)

```typescript
// @/lib/effects/types.ts
export interface CurvePoint {
  x: number;  // 0-1 timeline position
  y: number;  // 0-1 effect value
  handleIn?: { x: number; y: number };   // Bezier handle (incoming)
  handleOut?: { x: number; y: number };  // Bezier handle (outgoing)
}

export interface Effect {
  id: string;
  name: string;
  enabled: boolean;
  min: number;
  max: number;
  startT: number;
  endT: number;
  curvePoints: CurvePoint[];
}

export interface AnimationConfig {
  duration: number;
  curve: [number, number, number, number];  // Master timing bezier control points
  effects: Effect[];
}
```

### Shared Utilities (to extract to `@/lib/effects/`)

```typescript
// @/lib/effects/calculate.ts
export function calculateEffectValue(effect: Effect, progress: number): number;

// @/lib/effects/interpolation.ts
export function evaluateBezierCurve(points: CurvePoint[], x: number): number;
export function cubicBezier(t: number, curve: BezierCurve): number;
```

### Shared UI Components (to extract to `@/components/effects/`)

```typescript
// @/components/effects/EffectEditor.tsx
// Complete effect editing UI with curve, range, timeline

// @/components/effects/MultiPointCurveEditor.tsx
// Reusable multi-point bezier curve editor with handles

// @/components/effects/BezierCurveEditor.tsx
// Reusable bezier curve editor for master timing functions
```

### Component Integration Pattern

Each animated component follows this pattern:

```typescript
// 1. Define component-specific effects
const defaultEffects: Effect[] = [
  {
    id: 'scale',
    name: 'Scale',
    enabled: true,
    min: 1,
    max: 1.2,
    startT: 0,
    endT: 1,
    curvePoints: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
  },
  {
    id: 'opacity',
    name: 'Opacity',
    enabled: true,
    min: 0.8,
    max: 1,
    startT: 0,
    endT: 0.5,
    curvePoints: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
  },
];

// 2. Use the animation controller
const animController = new AnimationController(config);

// 3. In render/update loop
const progress = animController.getProgress();
const expansionProgress = isActive ? progress : (1 - progress);

// 4. Calculate each effect value
const scale = calculateEffectValue(scaleEffect, expansionProgress);
const opacity = calculateEffectValue(opacityEffect, expansionProgress);

// 5. Apply to renderer (CSS, WebGL, SVG, etc.)
element.style.transform = `scale(${scale})`;
element.style.opacity = opacity;
```

### Example: Animated Button

```typescript
// components/AnimatedButton.tsx
import { useEffect, useState, useRef } from 'react';
import { AnimationController } from '@/lib/effects/animation';
import { calculateEffectValue, Effect } from '@/lib/effects/types';

const buttonEffects: Effect[] = [
  { id: 'scale', name: 'Scale', enabled: true, min: 1, max: 1.05, startT: 0, endT: 1, curvePoints: [...] },
  { id: 'shadow', name: 'Shadow', enabled: true, min: 0, max: 20, startT: 0, endT: 0.8, curvePoints: [...] },
  { id: 'brightness', name: 'Brightness', enabled: true, min: 1, max: 1.1, startT: 0, endT: 0.5, curvePoints: [...] },
];

export function AnimatedButton({ children, effects = buttonEffects }) {
  const [isHovered, setIsHovered] = useState(false);
  const animRef = useRef(new AnimationController({ duration: 200, curve: [0.4, 0, 0.2, 1], effects }));

  // Update and apply effects in animation frame
  // ...
}
```

### Example: Toggle Switch

```typescript
// components/AnimatedToggle.tsx
const toggleEffects: Effect[] = [
  { id: 'knobX', name: 'Knob Position', min: 0, max: 24, ... },
  { id: 'trackColor', name: 'Track Hue', min: 0, max: 120, ... },
  { id: 'knobScale', name: 'Knob Scale', min: 1, max: 1.1, ... },
];
```

### Example: Image Transform

```typescript
// components/TransformingImage.tsx
const imageEffects: Effect[] = [
  { id: 'clipPath', name: 'Clip Progress', min: 0, max: 1, ... },
  { id: 'blur', name: 'Blur Amount', min: 0, max: 10, ... },
  { id: 'rotation', name: 'Rotation', min: 0, max: 15, ... },
];
```

### Future File Structure

```
src/
├── lib/
│   └── effects/
│       ├── types.ts              # Effect, CurvePoint, AnimationConfig
│       ├── calculate.ts          # calculateEffectValue
│       ├── interpolation.ts      # Catmull-Rom, Bezier utilities
│       └── animation.ts          # AnimationController
│
├── components/
│   └── effects/
│       ├── EffectEditor.tsx      # Full effect editing UI
│       ├── MultiPointCurveEditor.tsx
│       ├── BezierCurveEditor.tsx
│       └── EffectSettingsPanel.tsx
│
└── experiments/
    └── digital-material-lab/
        ├── index.tsx             # WebGL demo using shared effects
        ├── SettingsPanel.tsx     # Experiment-specific settings
        ├── shaders.ts
        └── webgl.ts
```

### Migration Steps

1. **Extract core types** to `@/lib/effects/types.ts`
2. **Extract calculation utilities** to `@/lib/effects/calculate.ts`
3. **Extract interpolation** to `@/lib/effects/interpolation.ts`
4. **Extract AnimationController** to `@/lib/effects/animation.ts`
5. **Extract UI components** to `@/components/effects/`
6. **Update digital-material-lab** to import from shared location
7. **Create additional examples** (button, toggle, image transform)
