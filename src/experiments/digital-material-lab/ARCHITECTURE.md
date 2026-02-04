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

Effects have a **single shared curve** that drives all variables. Each variable maps the curve output (0-1) to its own min/max range:

```typescript
// Variable definition - maps shared curve to a specific value range
interface EffectVariable {
  id: string;                    // Unique identifier within effect
  name: string;                  // Display name in UI
  min: number;                   // Value when curve = 0
  max: number;                   // Value when curve = 1
}

// Effect definition - single curve shared by all variables
interface Effect {
  id: string;                    // Unique identifier
  name: string;                  // Display name in UI
  enabled: boolean;              // Toggle on/off
  mode: 'state' | 'animate';     // Animation mode (see below)
  startT: number;                // When effect starts (0-1 of timeline)
  endT: number;                  // When effect ends (0-1 of timeline)
  curvePoints: CurvePoint[];     // Single shared curve (all variables use this)
  variables: EffectVariable[];   // Each variable has its own min/max
}

interface CurvePoint {
  x: number;  // 0-1 position on timeline
  y: number;  // 0-1 effect value (maps to each variable's min-max range)
  // Bezier handle offsets (relative to point position)
  handleIn?: { x: number; y: number };   // Control handle coming in (from left)
  handleOut?: { x: number; y: number };  // Control handle going out (to right)
}
```

### Effect Modes

Effects have two modes that control how the animation curve is played:

**State Mode** (`mode: 'state'`):
- Curve follows the expansion state
- Expanding: curve plays forward (0→1)
- Collapsing: curve plays backward (1→0)
- Use for: properties that should be different when expanded vs contracted
- Example: Corner radius (sharp when contracted, rounded when expanded)

**Animate Mode** (`mode: 'animate'`):
- Curve always plays forward (0→1) on every trigger
- Same animation whether expanding or collapsing
- Use for: one-shot effects, transitions, visual feedback
- Example: Focus/blur effect (blur in, then sharpen)

```typescript
// State mode - corner radius follows expansion state
{ mode: 'state', curvePoints: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }
// Result: Contracted = min, Expanded = max

// Animate mode - blur effect plays same each time
{ mode: 'animate', curvePoints: [{ x: 0, y: 1 }, { x: 1, y: 0 }] }
// Result: Always starts blurred, ends sharp
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

### Example: Corner Shape Effect (State Mode, Multiple Variables)

The corner shape effect has two variables (roundness and squircle) that share a single curve. The curve controls both variables simultaneously, each mapping to its own min/max:

```typescript
{
  id: 'cornerRadius',
  name: 'Corner Shape',
  enabled: true,
  mode: 'state',       // Different values when expanded vs contracted
  startT: 0,           // Start transitioning immediately
  endT: 1,             // Finish at full expansion
  curvePoints: [       // Single shared curve
    { x: 0, y: 0 },    // Contracted: curve = 0 (both vars at min)
    { x: 1, y: 1 },    // Expanded: curve = 1 (both vars at max)
  ],
  variables: [
    {
      id: 'roundness',
      name: 'Roundness',
      min: 0.01,           // Value when curve = 0
      max: 0.15,           // Value when curve = 1
    },
    {
      id: 'squircle',
      name: 'Squircle',
      min: 2.0,            // Value when curve = 0 (standard circle)
      max: 5.0,            // Value when curve = 1 (iOS-style squircle)
    },
  ],
}
```

**Squircle Explained**: The squircle parameter controls the superellipse exponent (n) for corner curves:
- `n = 2.0`: Standard circular corners (like regular rounded rect)
- `n = 4.0-5.0`: iOS-style squircle (smoother, more continuous corners)
- `n > 6.0`: Very squared corners but still smooth

### Example: Focus Effect (Animate Mode, Single Variable)

```typescript
{
  id: 'focus',
  name: 'Focus',
  enabled: true,
  mode: 'animate',     // Always plays forward on each trigger
  startT: 0,
  endT: 1,
  curvePoints: [       // Curve goes 1 → 0 (blur to sharp)
    { x: 0, y: 1 },    // Start: curve = 1 (max blur)
    { x: 1, y: 0 },    // End: curve = 0 (no blur)
  ],
  variables: [
    {
      id: 'amount',
      name: 'Blur Amount',
      min: 0,              // Value when curve = 0 (sharp)
      max: 20,             // Value when curve = 1 (blurred)
    },
  ],
}
```

### Parabolic Effect Example

```typescript
{
  id: 'bounce',
  name: 'Bounce Effect',
  enabled: true,
  mode: 'animate',     // One-shot animation
  startT: 0,
  endT: 1,
  curvePoints: [       // Parabolic curve (0 → peak → 0)
    { x: 0, y: 0 },     // Start at 0
    { x: 0.5, y: 0.8 }, // Peak at 80% in the middle
    { x: 1, y: 0 },     // Return to 0
  ],
  variables: [
    {
      id: 'intensity',
      name: 'Intensity',
      min: 0,
      max: 1,
    },
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
      mode: 'state',        // or 'animate' for one-shot effects
      startT: 0,
      endT: 1,
      curvePoints: [        // Single shared curve
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
      variables: [
        { id: 'primary', name: 'Primary Value', min: 0, max: 1 },
        { id: 'secondary', name: 'Secondary Value', min: 0, max: 100 },
        // Add more variables as needed - all share the same curve
      ],
    },
  ],
};
```

### Step 2: Calculate Variable Values in Render Loop

```typescript
const myEffect = animConfig.effects.find(e => e.id === 'myNewEffect');

// Calculate each variable value
const primaryValue = myEffect
  ? calculateVariableValue(myEffect, 'primary', expansionProgress, masterProgress)
  : defaultValue;

// Apply clamping if needed
const clampedValue = Math.min(primaryValue, maxAllowedValue);

// Use in shader or geometry
setUniform1f('u_myEffect', clampedValue);
```

**Note**: `calculateVariableValue` takes the effect, variable ID, and both progress values:
- State mode effects use `expansionProgress` (0=contracted, 1=expanded)
- Animate mode effects use `masterProgress` (always 0→1 on trigger)

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

### Effect Header
- Toggle switch to enable/disable the entire effect
- Mode selector: State (follows expansion) vs Animate (always forward)

### Timeline Position (Shared by all variables)
- **Start (green line)**: When effect begins transitioning - drag directly
- **End (red line)**: When effect finishes transitioning - drag directly
- Lines are directly draggable (no separate slider controls)

### Variables Section
Each effect can have multiple animated variables. Each variable has:

- **Collapsible header**: Click to expand/collapse variable settings
- **Min/Max Range**: Define the absolute bounds for this variable
- **Start/End Values**: Shows calculated values at curve start and end
- **Curve Editor**: Each variable has its own curve editor

### Multi-Point Bezier Curve Editor (Per Variable)
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

## GLSL ES Shader Guidelines

When writing or modifying shaders, be aware of these WebGL/GLSL ES 2.0 limitations that can cause **silent failures** (black screen with no error):

### Common Pitfalls

1. **`abs()` only works with `float`, not `int`**
   ```glsl
   // WRONG - will fail silently
   for (int x = -1; x <= 1; x++) {
     if (abs(x) > 0) { ... }  // abs(int) doesn't exist in GLSL ES
   }

   // CORRECT - cast to float first
   for (int x = -1; x <= 1; x++) {
     float fx = float(x);
     if (abs(fx) > 0.0) { ... }
   }
   ```

2. **Loop bounds must be constant expressions**
   ```glsl
   // WRONG - dynamic loop bounds
   for (int i = 0; i < someUniform; i++) { }

   // CORRECT - constant bounds
   for (int i = 0; i < 10; i++) { }
   ```

3. **Array indices must be constant or loop variables**
   ```glsl
   // WRONG - dynamic array index
   float value = myArray[int(someFloat)];

   // CORRECT - use loop variable
   for (int i = 0; i < 4; i++) {
     if (i == int(someFloat)) value = myArray[i];
   }
   ```

4. **No implicit type conversion**
   ```glsl
   // WRONG
   float x = 1;      // int to float
   vec2 v = 0.5;     // float to vec2

   // CORRECT
   float x = 1.0;
   vec2 v = vec2(0.5);
   ```

### Debugging Shader Issues

If the canvas shows **black screen** after shader changes:
1. Check browser console for WebGL errors
2. Look for GLSL compilation errors in `compileShader()` output
3. Review all `abs()`, `min()`, `max()` calls - they need float arguments
4. Verify all loop bounds are constant
5. Check for missing precision qualifiers (`precision highp float;`)

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

export interface EffectVariable {
  id: string;
  name: string;
  min: number;
  max: number;
  curvePoints: CurvePoint[];
}

export interface Effect {
  id: string;
  name: string;
  enabled: boolean;
  mode: 'state' | 'animate';  // 'state' follows expansion, 'animate' always forward
  startT: number;
  endT: number;
  variables: EffectVariable[];
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
export function calculateVariableValue(
  effect: Effect,
  variableId: string,
  expansionProgress: number,
  masterProgress: number
): number;

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
// 1. Define component-specific effects with variables
const defaultEffects: Effect[] = [
  {
    id: 'transform',
    name: 'Transform',
    enabled: true,
    mode: 'state',
    startT: 0,
    endT: 1,
    variables: [
      { id: 'scale', name: 'Scale', min: 1, max: 1.2, curvePoints: [{ x: 0, y: 0 }, { x: 1, y: 1 }] },
      { id: 'opacity', name: 'Opacity', min: 0.8, max: 1, curvePoints: [{ x: 0, y: 0 }, { x: 1, y: 1 }] },
    ],
  },
];

// 2. Use the animation controller
const animController = new AnimationController(config);

// 3. In render/update loop
const progress = animController.getProgress();
const expansionProgress = isActive ? progress : (1 - progress);

// 4. Calculate each variable value
const transformEffect = effects.find(e => e.id === 'transform');
const scale = calculateVariableValue(transformEffect, 'scale', expansionProgress, progress);
const opacity = calculateVariableValue(transformEffect, 'opacity', expansionProgress, progress);

// 5. Apply to renderer (CSS, WebGL, SVG, etc.)
element.style.transform = `scale(${scale})`;
element.style.opacity = opacity;
```

### Example: Animated Button

```typescript
// components/AnimatedButton.tsx
import { useEffect, useState, useRef } from 'react';
import { AnimationController } from '@/lib/effects/animation';
import { calculateVariableValue, Effect } from '@/lib/effects/types';

const buttonEffects: Effect[] = [
  {
    id: 'hover',
    name: 'Hover Effect',
    enabled: true,
    mode: 'state',
    startT: 0,
    endT: 1,
    variables: [
      { id: 'scale', name: 'Scale', min: 1, max: 1.05, curvePoints: [...] },
      { id: 'shadow', name: 'Shadow', min: 0, max: 20, curvePoints: [...] },
      { id: 'brightness', name: 'Brightness', min: 1, max: 1.1, curvePoints: [...] },
    ],
  },
];

export function AnimatedButton({ children, effects = buttonEffects }) {
  const [isHovered, setIsHovered] = useState(false);
  const animRef = useRef(new AnimationController({ duration: 200, curve: [0.4, 0, 0.2, 1], effects }));

  // Update and apply effects in animation frame
  // const scale = calculateVariableValue(hoverEffect, 'scale', expansionProgress, masterProgress);
}
```

### Example: Toggle Switch

```typescript
// components/AnimatedToggle.tsx
const toggleEffects: Effect[] = [
  {
    id: 'toggle',
    name: 'Toggle Animation',
    enabled: true,
    mode: 'state',
    startT: 0,
    endT: 1,
    variables: [
      { id: 'knobX', name: 'Knob Position', min: 0, max: 24, curvePoints: [...] },
      { id: 'trackColor', name: 'Track Hue', min: 0, max: 120, curvePoints: [...] },
      { id: 'knobScale', name: 'Knob Scale', min: 1, max: 1.1, curvePoints: [...] },
    ],
  },
];
```

### Example: Image Transform

```typescript
// components/TransformingImage.tsx
const imageEffects: Effect[] = [
  {
    id: 'reveal',
    name: 'Reveal Effect',
    enabled: true,
    mode: 'animate',
    startT: 0,
    endT: 1,
    variables: [
      { id: 'clipPath', name: 'Clip Progress', min: 0, max: 1, curvePoints: [...] },
      { id: 'blur', name: 'Blur Amount', min: 10, max: 0, curvePoints: [...] },
      { id: 'rotation', name: 'Rotation', min: 5, max: 0, curvePoints: [...] },
    ],
  },
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
