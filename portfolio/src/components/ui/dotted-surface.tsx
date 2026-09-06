import { useTheme } from 'next-themes';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

import { cn } from '@/lib/utils';

/**
 * A field of points rolling on two crossed sine waves, sitting behind the page.
 *
 * Changes from the component as supplied, each for a reason:
 *
 * 1. SPEED. `count += 0.1` every frame ran the wave fast and, worse, tied it to
 *    refresh rate — the same page moved twice as fast on a 120Hz display. The
 *    wave now advances on elapsed time, so it looks identical everywhere, and
 *    the default rate is a quarter of the original.
 *
 * 2. THE ANIMATION NEVER STOPPED. `animationId` was snapshotted into a ref on
 *    the frame after mount, but `animate()` reassigns it every frame. Cleanup
 *    cancelled that first, long-dead id, so the loop kept running against a
 *    disposed renderer for the life of the tab. The live id is now cancelled.
 *
 * 3. COLOURS WERE OUT OF RANGE. Float32 vertex colours are 0–1; the original
 *    pushed `200, 200, 200`, which clamps to pure white — so "dark theme grey"
 *    rendered as blown-out white. Normalised to 0–1.
 *
 * 4. FOG WAS ALWAYS WHITE. On a dark ground, distant points faded *up* into
 *    white instead of receding. Fog now takes the ground colour.
 *
 * Plus: the loop pauses when the tab is hidden or the user prefers reduced
 * motion, device pixel ratio is capped at 2, and the grid thins on small
 * screens — 2,400 points at DPR 3 is a lot of fragment work for a phone.
 */

type DottedSurfaceProps = Omit<React.ComponentProps<'div'>, 'ref'> & {
  /** Point size in px. */
  size?: number;
  opacity?: number;
  sizeAttenuation?: boolean;
  vertexColors?: boolean;
  /** Wave advance in radians/second. The original was ~6; this is deliberately slow. */
  speed?: number;
  /** Peak wave height in world units. */
  amplitude?: number;
};

const SEPARATION = 150;

export function DottedSurface({
  className,
  size = 8,
  opacity = 0.8,
  sizeAttenuation = true,
  vertexColors = true,
  speed = 1.5,
  amplitude = 50,
  ...props
}: DottedSurfaceProps) {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  // Live values the animation loop reads, so changing them does not rebuild the
  // scene. Only structural changes (theme, geometry) re-run the effect.
  const speedRef = useRef(speed);
  const amplitudeRef = useRef(amplitude);
  speedRef.current = speed;
  amplitudeRef.current = amplitude;

  const isDark = resolvedTheme !== 'light';

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const small = window.matchMedia('(max-width: 768px)').matches;

    // thin the grid on phones — the full field is 2,400 points
    const AMOUNTX = small ? 24 : 40;
    const AMOUNTY = small ? 34 : 60;

    const ground = isDark ? 0x08080a : 0xf5f5f4;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(ground, 2000, 10000);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.set(0, 355, 1220);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    } catch (err) {
      console.warn('DottedSurface: WebGL unavailable', err);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(ground, 0);
    container.appendChild(renderer.domElement);

    const positions: number[] = [];
    const colors: number[] = [];
    // Float32 vertex colours are 0–1, not 0–255.
    const c = isDark ? 200 / 255 : 0;

    for (let ix = 0; ix < AMOUNTX; ix++) {
      for (let iy = 0; iy < AMOUNTY; iy++) {
        positions.push(
          ix * SEPARATION - (AMOUNTX * SEPARATION) / 2,
          0,
          iy * SEPARATION - (AMOUNTY * SEPARATION) / 2,
        );
        colors.push(c, c, c);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size,
      vertexColors,
      color: vertexColors ? undefined : isDark ? 0xc8c8c8 : 0x000000,
      transparent: true,
      opacity,
      sizeAttenuation,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const positionAttribute = geometry.attributes.position as THREE.BufferAttribute;
    const array = positionAttribute.array as Float32Array;

    let count = 0;
    let raf = 0;
    let last = performance.now();

    /** One pass of the wave at the current phase. */
    const writeWave = () => {
      let i = 0;
      const amp = amplitudeRef.current;
      for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
          array[i * 3 + 1] = Math.sin((ix + count) * 0.3) * amp + Math.sin((iy + count) * 0.5) * amp;
          i++;
        }
      }
      positionAttribute.needsUpdate = true;
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05); // clamp: tab wake shouldn't jump the wave
      last = now;
      count += speedRef.current * dt;
      writeWave();
      renderer.render(scene, camera);
    };

    const start = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      if (!raf) return;
      cancelAnimationFrame(raf);
      raf = 0;
    };

    // Still render one frame when motion is reduced, so the field is present
    // but static rather than missing entirely.
    writeWave();
    renderer.render(scene, camera);
    if (!reduced.matches) start();

    const onVisibility = () => (document.hidden || reduced.matches ? stop() : start());
    const onMotionPref = () => (reduced.matches ? stop() : start());
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    reduced.addEventListener('change', onMotionPref);

    return () => {
      stop(); // the live id, not a snapshot of the first one
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      reduced.removeEventListener('change', onMotionPref);

      geometry.dispose();
      material.dispose();
      scene.remove(points);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [isDark, size, opacity, sizeAttenuation, vertexColors]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={cn('pointer-events-none fixed inset-0 -z-10', className)}
      {...props}
    />
  );
}

export default DottedSurface;
