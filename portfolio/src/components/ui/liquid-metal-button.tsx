import { liquidMetalFragmentShader, ShaderMount } from '@paper-design/shaders';
import { Sparkles } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/** A liquid-metal pill that only animates while its corridor wall is active. */

export interface LiquidMetalButtonProps {
  label?: string;
  onClick?: () => void;
  viewMode?: 'text' | 'icon';
  /** Render the control as a link, with the same visible label. */
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
  const [reducedMotion, setReducedMotion] = useState(false);

  const shaderRef = useRef<HTMLDivElement>(null);
  const shaderMount = useRef<ShaderMount | null>(null);
  const buttonRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
  const rippleId = useRef(0);
  const timers = useRef<number[]>([]);
  const hoveredRef = useRef(false);
  const requestedSpeed = useRef<number>(SPEED.idle);
  const animationAllowed = useRef(false);
  const motionReduced = useRef(false);

  const setSpeed = useCallback((speed: number) => {
    requestedSpeed.current = speed;
    shaderMount.current?.setSpeed(animationAllowed.current ? speed : 0);
  }, []);

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

    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const frame = el.closest<HTMLElement>('section');

    const syncAnimation = () => {
      // A receding wall still intersects the viewport, but its content is a
      // ghost. The corridor owns that distinction; the shader itself already
      // pauses when offscreen or when the browser tab is hidden.
      const active = !frame?.classList.contains('corridor-frame') || (
        frame.dataset.active !== undefined
          ? frame.dataset.active === '1'
          : frame.dataset.on === '1' && !frame.hasAttribute('inert')
      );
      motionReduced.current = preference.matches;
      animationAllowed.current = active && !preference.matches;
      shaderMount.current?.setSpeed(animationAllowed.current ? requestedSpeed.current : 0);
    };
    const onMotionChange = () => {
      setReducedMotion(preference.matches);
      if (preference.matches) setRipples([]);
      syncAnimation();
    };

    onMotionChange();
    preference.addEventListener('change', onMotionChange);
    const observer = frame ? new MutationObserver(syncAnimation) : null;
    if (frame) observer?.observe(frame, {
      attributes: true,
      attributeFilter: ['class', 'data-active', 'data-on', 'inert'],
    });

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
        0,
      );
      shaderMount.current = mount;
      syncAnimation();
    } catch (error) {
      // No WebGL (locked-down browser, some headless contexts). The pill still
      // has a static metallic rim and its accessible control remains usable.
      console.warn('LiquidMetalButton: shader unavailable, falling back', error);
    }

    return () => {
      observer?.disconnect();
      preference.removeEventListener('change', onMotionChange);
      animationAllowed.current = false;
      for (const t of timers.current) window.clearTimeout(t);
      timers.current = [];
      mount?.dispose();
      shaderMount.current = null;
    };
  }, []);

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
    if (host && !motionReduced.current) {
      const rect = host.getBoundingClientRect();
      const ripple = {
        x: e.detail === 0 ? rect.width / 2 : e.clientX - rect.left,
        y: e.detail === 0 ? rect.height / 2 : e.clientY - rect.top,
        id: rippleId.current++,
      };
      setRipples((prev) => [...prev, ripple]);
      later(() => setRipples((prev) => prev.filter((r) => r.id !== ripple.id)), 600);
    }

    onClick?.();
  };

  const press = isPressed && !reducedMotion ? 'translateY(1px) scale(0.98)' : 'translateY(0) scale(1)';
  const spring = reducedMotion ? 'none' : 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
  const shadowTransition = reducedMotion ? 'none' : `${spring}, box-shadow .15s cubic-bezier(.4,0,.2,1)`;
  const box = { width: dimensions.width, height: dimensions.height };

  const shadow = isPressed
    ? '0 0 0 1px rgba(0,0,0,.5), 0 1px 2px rgba(0,0,0,.3)'
    : isHovered
      ? '0 0 0 1px rgba(0,0,0,.4), 0 12px 6px rgba(0,0,0,.05), 0 8px 5px rgba(0,0,0,.1), 0 4px 4px rgba(0,0,0,.15), 0 1px 2px rgba(0,0,0,.2)'
      : '0 0 0 1px rgba(0,0,0,.3), 0 36px 14px rgba(0,0,0,.02), 0 20px 12px rgba(0,0,0,.08), 0 9px 9px rgba(0,0,0,.12), 0 2px 5px rgba(0,0,0,.15)';

  const controlProps = {
    ref: (node: HTMLButtonElement | HTMLAnchorElement | null) => { buttonRef.current = node; },
    className: 'metal-button-control',
    onClick: handleActivate,
    onMouseEnter: handleEnter,
    onMouseLeave: handleLeave,
    onMouseDown: () => setIsPressed(true),
    onMouseUp: () => setIsPressed(false),
    onFocus: handleEnter,
    onBlur: handleLeave,
    'aria-label': ariaLabel ?? label,
    style: {
      position: 'absolute', inset: 0, ...box,
      background: 'transparent', border: 'none', cursor: 'pointer',
      zIndex: 40, transformStyle: 'preserve-3d', transform: 'translateZ(25px)',
      transition: spring, overflow: 'hidden', borderRadius: 100,
      display: 'block',
    } satisfies React.CSSProperties,
  };
  const rippleElements = ripples.map((r) => (
    <span
      key={r.id}
      aria-hidden="true"
      style={{
        position: 'absolute', left: r.x, top: r.y, width: 20, height: 20, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,255,255,.4) 0%, rgba(255,255,255,0) 70%)',
        pointerEvents: 'none', animation: 'lmb-ripple .6s ease-out',
      }}
    />
  ));

  return (
    <div className={cnLite('metal-button relative inline-block', className)}>
      <div style={{ perspective: 1000, perspectiveOrigin: '50% 50%' }}>
        <div style={{ position: 'relative', ...box, transformStyle: 'preserve-3d', transition: spring }}>
          {/* face: the label rides above the glass */}
          <div
            aria-hidden="true"
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
            aria-hidden="true"
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
                transition: shadowTransition,
              }}
            />
          </div>

          {/* the shader itself */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute', inset: 0, ...box, transformStyle: 'preserve-3d',
              transform: `translateZ(0px) ${press}`, transition: spring, zIndex: 10,
            }}
          >
            <div style={{ ...box, borderRadius: 100, boxShadow: shadow, transition: shadowTransition }}>
              <div
                ref={shaderRef}
                className="lmb-shader"
                style={{
                  ...box, maxWidth: dimensions.width, borderRadius: 100, overflow: 'hidden', position: 'relative',
                  background: 'linear-gradient(120deg, #444 0%, #ddd 22%, #555 44%, #c4c4c4 66%, #333 86%, #aaa 100%)',
                }}
              />
            </div>
          </div>

          {href ? (
            <a {...controlProps} href={href}>{rippleElements}</a>
          ) : (
            <button {...controlProps} type="button">{rippleElements}</button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Tiny local join so this file has no import cycle with lib/utils. */
function cnLite(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(' ');
}
