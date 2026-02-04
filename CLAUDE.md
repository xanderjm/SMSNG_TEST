# Claude Code Project Rules

## Project Overview

This is an experimental UI/animation project built with React, TypeScript, and WebGL. The main focus is a reusable **Effect System** for animating UI components.

## Important Documentation Locations

Before making changes, **always read the relevant architecture files**:

| Location | Purpose |
|----------|---------|
| `src/experiments/digital-material-lab/ARCHITECTURE.md` | Effect system architecture, interfaces, GLSL guidelines |
| This file (`CLAUDE.md`) | Project-wide rules and conventions |

## Core Rules

### 1. Always Check Architecture First

Before modifying any effect system code, read:
- `src/experiments/digital-material-lab/ARCHITECTURE.md`

This contains:
- Effect interface definitions
- Mode explanations (state vs animate)
- Curve point structure with bezier handles
- GLSL ES shader guidelines (critical for avoiding black screen bugs)
- UI component patterns

### 2. Keep Documentation Updated

**After any significant changes**, update the relevant documentation:
- New effect? Add to ARCHITECTURE.md examples
- New interface property? Update the interface definition in docs
- New GLSL pattern? Add to shader guidelines
- Bug fix? Consider if it should be documented to prevent recurrence

### 3. Follow Effect System Patterns

When creating new effects, follow this process (documented in ARCHITECTURE.md):

1. **Define the effect** in `defaultAnimConfig.effects[]`
2. **Calculate the value** in the render loop using `calculateEffectValue()`
3. **Pass to shader** via uniform (if GPU-based)
4. **Add UI controls** in `SettingsPanel.tsx`

### 4. GLSL ES 2.0 Critical Rules

WebGL uses GLSL ES 2.0 which has strict limitations that cause **silent failures** (black screen):

```glsl
// WRONG - abs() only works with float, NOT int
if (abs(intVar) > 1) { }

// CORRECT - cast to float first
float f = float(intVar);
if (abs(f) > 1.0) { }
```

See ARCHITECTURE.md "GLSL ES Shader Guidelines" for full list.

### 5. Effect Interface

Current Effect interface (keep docs updated if this changes):

```typescript
interface Effect {
  id: string;
  name: string;
  enabled: boolean;
  mode: 'state' | 'animate';  // state=follows expansion, animate=always forward
  min: number;
  max: number;
  startT: number;
  endT: number;
  curvePoints: CurvePoint[];
}

interface CurvePoint {
  x: number;
  y: number;
  handleIn?: { x: number; y: number };
  handleOut?: { x: number; y: number };
}
```

### 6. UI Theme

Dark theme with neutral grays:
- Background: `neutral-900`
- Inputs/editors: `neutral-800`
- Borders: `neutral-700`
- Text: `neutral-400` (labels), `neutral-300` (values)
- Accents: `emerald-500` (start), `rose-500` (end)

## File Structure

```
src/
├── experiments/
│   └── digital-material-lab/
│       ├── index.tsx             # Main component, Effect interface
│       ├── SettingsPanel.tsx     # UI controls
│       ├── MultiPointCurveEditor.tsx  # Curve editor with bezier handles
│       ├── BezierCurveEditor.tsx # Master timing curve editor
│       ├── shaders.ts            # GLSL shaders
│       ├── animation.ts          # Animation utilities
│       ├── webgl.ts              # WebGL setup
│       └── ARCHITECTURE.md       # Detailed documentation
```

## Commit Convention

Use conventional commits:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation updates
- `refactor:` Code restructuring

Always include the session link at the end of commit messages.

## Testing Changes

After any shader or effect changes:
1. Run `npm run build` to check for TypeScript errors
2. Test in browser - watch for black screen (shader compilation failure)
3. Test both expand and collapse animations
4. Test with different mode settings (state vs animate)
