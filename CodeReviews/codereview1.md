# Bismuth-Mod Code Review Report

## 📋 Executive Summary
This document summarizes the findings from a deep dive into the Bismuth-mod codebase, specifically focusing on the renderer architecture (`src/renderer/`), compute shader implementations (`resources/shaders/`), and memory management. 

The project utilizes a highly optimized GPU-driven rendering pipeline using **Compute Shaders** for frustum culling and sprite sorting. The use of C++23 features (like `std::span`) and Structure-of-Arrays (SAO) buffers is excellent for performance, but there are critical logic errors in the compute shaders and missing OpenGL state management that need immediate attention.

## 🔴 Critical Bugs (Must Fix)

### 1. The "Red Screen" Transparency Bug
**File:** `resources/shaders/objectCulling.comp`  
**Location:** Lines ~94–96

```glsl
// BUG: This forces semi-transparent sprites to pure red!
if (color.a < 1.0) { 
    color.rgb = vec3(1.0, 0.0, 0.0); // Forces RGB to Red regardless of actual sprite color!
}
```

*   **Why it breaks:** When a sprite has an alpha value less than `1.0` (e.g., a shadow, a glow, or a semi-transparent trigger), this logic overrides the sprite's actual colors with `(255, 0, 0)`. This likely causes the entire screen to turn red in complex levels.
*   **Fix:** Remove this block entirely. Standard alpha blending should handle transparency automatically. If you want to discard fully invisible fragments, use `discard` instead of forcing red.

### 2. Culling Frustum Math Mismatch
**File:** `resources/shaders/objectCulling.comp`  
**Location:** Lines ~140–156

```glsl
const float threshold = 100.0; // Hardcoded world units!
return screenPos.x >= -threshold && 
       screenPos.x <= u_cameraSize.x + threshold; // Inconsistent bounds!
```

*   **Why it breaks:** `u_cameraSize` is in world units (from `GameStateBuffer`), but you are mixing a hardcoded `100.0` with dynamic camera dimensions. If your level coordinates extend beyond 100 units, objects will be incorrectly culled even if they are visible on screen.
*   **Fix:** Use symmetric half-extend bounds based entirely on the camera size:
    ```glsl
    float halfWidth = u_cameraSize.x * 0.5;
    float halfHeight = u_cameraSize.y * 0.5;
    
    return screenPos.x >= -halfWidth && screenPos.x <= halfWidth &&
           screenPos.y >= -halfHeight && screenPos.y <= halfHeight;
    ```

### 3. Missing OpenGL State Save/Restore
**File:** `src/renderer/Renderer.cpp`  
**Location:** Lines ~56, ~90

*   **Issue:** You call `storeGLStates()` and `restoreGLStates()`, but the actual implementation is missing or heavily commented out. If you change global OpenGL state (like VAOs or Programs) inside your custom draw functions without saving/restoring them, you will break Cocos2d-x's rendering pipeline later in the frame.
*   **Fix:** Implement a minimal save/restore block:
    ```cpp
    void Renderer::storeGLStates() {
        glGetIntegerv(GL_VERTEX_ARRAY_BINDING, &storedVAO);
        glGetIntegerv(GL_CURRENT_PROGRAM, &storedProgram);
        glGetIntegerv(GL_BLEND_SRC_RGB,   &storedBlendSrcRGB);
        glGetIntegerv(GL_BLEND_SRC_ALPHA, &storedBlendSrcAlpha);
        glGetIntegerv(GL_BLEND_DST_RGB,   &storedBlendDstRGB);
        glGetIntegerv(GL_BLEND_DST_ALPHA, &storedBlendDstAlpha);
    }

    void Renderer::restoreGLStates() {
        glBindVertexArray(storedVAO);
        glUseProgram(storedProgram);
        glBlendFuncSeparate(
            storedBlendSrcRGB, storedBlendDstRGB, 
            storedBlendSrcAlpha, storedBlendDstAlpha
        );
    }
    ```

### 4. Matrix Multiplication Order Risk
**File:** `resources/shaders/objectCulling.comp`  
**Location:** Line ~43

```glsl
objectPosition = state.positionalTransform * startPosition + state.offset;