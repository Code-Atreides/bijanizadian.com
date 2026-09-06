import { liquidMetalFragmentShader, ShaderMount } from '@paper-design/shaders';
import { Sparkles } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * A pill button whose face is a live liquid-metal WebGL shader.
 *
 * Two deviations from the component as supplied, both deliberate:
 *
 * 1. Teardown calls `dispose()`, not `destroy()`. @paper-design/shaders exposes
 *    `dispose: () => void` on ShaderMount — there is no `destroy`. Because the
 *    original guarded with optional chaining (`shaderMount.current?.destroy`),
 *    the call silently never fired and every unmounted button leaked its WebGL
 *    context. Browsers cap live contexts at roughly 16, after which new ones
 *    fail, so a page that mounts and unmounts these eventually renders bare
 *    pills. `destroy` is still tried first in case a future version renames it.
 *
 * 2. Ripple timeouts and the speed-restore timeout are tracked and cleared on
 *    unmount, so a button removed mid-animation cannot setState afterwards.
 */

export interface LiquidMetalButtonProps {
  label?: string;
  onClick?: () => void;
  viewMode?: 'text' | 'icon';
  /** Rendered instead of the label — lets the pill act as a link. */
  href?: string;
  className?: string;
  ariaLabel?: string;
}

type Ripple = { x: number; y: number; id: number };

/** Idle drift, hover, and the kick on press. Slow enough to read as metal. */
const SPEED = { idle: 0.35, hover: 0.7, press: 1.6 } as const;

export function LiquidMetalButton({
  label = 'Get Started',
  onClick,
  viewMode = 'text',
  href,
  className,
  ariaLabel,
}: LiquidMetalButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const shaderRef = useRef<HTMLDivElement>(null);
  const shaderMount = useRef<ShaderMount | null>(null);
  const buttonRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
  const rippleId = useRef(0);
  const timers = useRef<number[]>([]);
  const hoveredRef = useRef(false);

  const dimensions = useMemo(
    () =>
      viewMode === 'icon'
        ? { width: 46, height: 46, innerWidth: 42, innerHeight: 42 }
        : { width: 168, height: 46, innerWidth: 164, innerHeight: 42 },
    [viewMode],
  );

  /** Track a timeout so unmount can cancel it. */
  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current = timers.current.filter((t) => t !== id);
      fn();
    }, ms);
    timers.current.push(id);
  }, []);

  useEffect(() => {
    const el = shaderRef.current;
    if (!el) return;

    let mount: ShaderMount | null = null;
    try {
      mount = new ShaderMount(
        el,
        liquidMetalFragmentShader,
        {
          u_repetition: 4,
          u_softness: 0.5,
          u_shiftRed: 0.3,
          u_shiftBlue: 0.3,
          u_distortion: 0,
          u_contour: 0,
          u_angle: 45,
          u_scale: 8,
          u_shape: 1,
          u_offsetX: 0.1,
          u_offsetY: -0.1,
        },
        undefined,
        SPEED.idle,
      );
      shaderMount.current = mount;
    } catch (error) {
      // No WebGL (locked-down browser, some headless contexts). The pill still
      // renders — it just sits on the black gradient underneath.
      console.warn('LiquidMetalButton: shader unavailable, falling back', error);
    }

    return () => {
      for (const t of timers.current) window.clearTimeout(t);
      timers.current = [];
      const m = shaderMount.current as (ShaderMount & { destroy?: () => void }) | null;
      m?.destroy?.() ?? m?.dispose?.();
      shaderMount.current = null;
    };
  }, []);

  const setSpeed = (speed: number) => shaderMount.current?.setSpeed?.(speed);

  const handleEnter = () => {
    hoveredRef.current = true;
    setIsHovered(true);
    setSpeed(SPEED.hover);
  };

  const handleLeave = () => {
    hoveredRef.current = false;
    setIsHovered(false);
    setIsPressed(false);
    setSpeed(SPEED.idle);
  };

  const handleActivate = (e: React.MouseEvent<HTMLElement>) => {
    setSpeed(SPEED.press);
    later(() => setSpeed(hoveredRef.current ? SPEED.hover : SPEED.idle), 300);

    const host = buttonRef.current;
    if (host) {
      const rect = host.getBoundingClientRect();
      const ripple = { x: e.clientX - rect.left, y: e.clientY - rect.top, id: rippleId.current++ };
      setRipples((prev) => [...prev, ripple]);
      later(() => setRipples((prev) => prev.filter((r) => r.id !== ripple.id)), 600);
    }

    onClick?.();
  };

  const press = isPressed ? 'translateY(1px) scale(0.98)' : 'translateY(0) scale(1)';
  const spring = 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
  const box = { width: dimensions.width, height: dimensions.height };

  const shadow = isPressed
    ? '0 0 0 1px rgba(0,0,0,.5), 0 1px 2px rgba(0,0,0,.3)'
    : isHovered
      ? '0 0 0 1px rgba(0,0,0,.4), 0 12px 6px rgba(0,0,0,.05), 0 8px 5px rgba(0,0,0,.1), 0 4px 4px rgba(0,0,0,.15), 0 1px 2px rgba(0,0,0,.2)'
      : '0 0 0 1px rgba(0,0,0,.3), 0 36px 14px rgba(0,0,0,.02), 0 20px 12px rgba(0,0,0,.08), 0 9px 9px rgba(0,0,0,.12), 0 2px 5px rgba(0,0,0,.15)';

  const Interactive = (href ? 'a' : 'button') as 'a';

  return (
    <div className={cnLite('relative inline-block', className)}>
      <div style={{ perspective: 1000, perspectiveOrigin: '50% 50%' }}>
        <div style={{ position: 'relative', ...box, transformStyle: 'preserve-3d', transition: spring }}>
          {/* face: the label rides above the glass */}
          <div
            style={{
              position: 'absolute', inset: 0, ...box,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transformStyle: 'preserve-3d', transform: 'translateZ(20px)',
              transition: spring, zIndex: 30, pointerEvents: 'none',
            }}
          >
            {viewMode === 'icon' ? (
              <Sparkles size={16} style={{ color: '#e8e8e8', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.6))' }} />
            ) : (
              <span
                style={{
                  fontSize: 14, fontWeight: 500, letterSpacing: '-0.01em', color: '#ededed',
                  textShadow: '0 1px 2px rgba(0,0,0,.6)', whiteSpace: 'nowrap', transition: spring,
                }}
              >
                {label}
              </span>
            )}
          </div>

          {/* the dark bezel */}
          <div
            style={{
              position: 'absolute', inset: 0, ...box, transformStyle: 'preserve-3d',
              transform: `translateZ(10px) ${press}`, transition: spring, zIndex: 20,
            }}
          >
            <div
              style={{
                width: dimensions.innerWidth, height: dimensions.innerHeight, margin: 2, borderRadius: 100,
                background: 'linear-gradient(180deg, #202020 0%, #000 100%)',
                boxShadow: isPressed ? 'inset 0 2px 4px rgba(0,0,0,.4), inset 0 1px 2px rgba(0,0,0,.3)' : 'none',
                transition: `${spring}, box-shadow .15s cubic-bezier(.4,0,.2,1)`,
              }}
            />
          </div>

          {/* the shader itself */}
          <div
            style={{
              position: 'absolute', inset: 0, ...box, transformStyle: 'preserve-3d',
              transform: `translateZ(0px) ${press}`, transition: spring, zIndex: 10,
            }}
          >
            <div style={{ ...box, borderRadius: 100, boxShadow: shadow, transition: `${spring}, box-shadow .15s cubic-bezier(.4,0,.2,1)` }}>
              <div
                ref={shaderRef}
                className="lmb-shader"
                style={{ ...box, maxWidth: dimensions.width, borderRadius: 100, overflow: 'hidden', position: 'relative' }}
              />
            </div>
          </div>

          <Interactive
            ref={buttonRef as React.Ref<HTMLAnchorElement>}
            {...(href ? { href } : { type: 'button' as const })}
            onClick={handleActivate}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            onFocus={handleEnter}
            onBlur={handleLeave}
            aria-label={ariaLabel ?? label}
            style={{
              position: 'absolute', inset: 0, ...box,
              background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none',
              zIndex: 40, transformStyle: 'preserve-3d', transform: 'translateZ(25px)',
              transition: spring, overflow: 'hidden', borderRadius: 100,
              display: 'block',
            }}
          >
            {ripples.map((r) => (
              <span
                key={r.id}
                style={{
                  position: 'absolute', left: r.x, top: r.y, width: 20, height: 20, borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(255,255,255,.4) 0%, rgba(255,255,255,0) 70%)',
                  pointerEvents: 'none', animation: 'lmb-ripple .6s ease-out',
                }}
              />
            ))}
          </Interactive>
        </div>
      </div>
    </div>
  );
}

/** Tiny local join so this file has no import cycle with lib/utils. */
function cnLite(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(' ');
}
