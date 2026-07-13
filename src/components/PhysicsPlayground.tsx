"use client";

import { useEffect, useRef } from "react";
import Matter from "matter-js";
import { TrendingUp, Search, Rocket, Shield, DollarSign, BarChart3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Ink = "riso-red" | "riso-blue" | "riso-green" | "riso-gold";

const INK_STYLES: Record<Ink, { border: string; bg: string }> = {
  "riso-red": { border: "border-riso-red", bg: "bg-riso-red/15" },
  "riso-blue": { border: "border-riso-blue", bg: "bg-riso-blue/15" },
  "riso-green": { border: "border-riso-green", bg: "bg-riso-green/15" },
  "riso-gold": { border: "border-riso-gold", bg: "bg-riso-gold/15" },
};

const ITEMS: { icon: LucideIcon; ink: Ink }[] = [
  { icon: TrendingUp, ink: "riso-green" },
  { icon: Search, ink: "riso-blue" },
  { icon: Rocket, ink: "riso-gold" },
  { icon: Shield, ink: "riso-red" },
  { icon: DollarSign, ink: "riso-gold" },
  { icon: BarChart3, ink: "riso-blue" },
];

const BALL_SIZE = 52;

export function PhysicsPlayground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const ballRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const engine = Matter.Engine.create();
    engine.gravity.y = reducedMotion ? 0 : 1;

    const wallOptions: Matter.IChamferableBodyDefinition = {
      isStatic: true,
      restitution: 0.6,
      friction: 0.1,
    };
    // No top wall — balls spawn above the visible box and fall in through
    // the open top. A solid ceiling here would trap them before they ever
    // enter (they spawn only slightly above it).
    const walls = [
      Matter.Bodies.rectangle(width / 2, height + 10, width, 20, wallOptions),
      Matter.Bodies.rectangle(-10, height / 2, 20, height, wallOptions),
      Matter.Bodies.rectangle(width + 10, height / 2, 20, height, wallOptions),
    ];

    const balls = ITEMS.map((_, i) =>
      Matter.Bodies.circle(
        BALL_SIZE + i * (width / ITEMS.length),
        reducedMotion ? height / 2 : -50 - i * 40,
        BALL_SIZE / 2,
        { restitution: 0.7, friction: 0.05, frictionAir: 0.001 }
      )
    );

    Matter.Composite.add(engine.world, [...walls, ...balls]);

    const mouse = Matter.Mouse.create(container);
    const mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse,
      constraint: { stiffness: 0.2, render: { visible: false } },
    });
    Matter.Composite.add(engine.world, mouseConstraint);
    // Matter attaches a wheel listener via the mouse element that blocks page
    // scroll while hovering the sandbox — remove it, we only want drag.
    // `mousewheel` is the real bound handler (verified in matter-js source)
    // but isn't in @types/matter-js, hence the cast.
    const mouseWithWheel = mouse as Matter.Mouse & { mousewheel: EventListener };
    container.removeEventListener("wheel", mouseWithWheel.mousewheel);

    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);

    let animationFrameId: number;
    function render() {
      balls.forEach((ball, i) => {
        const el = ballRefs.current[i];
        if (el) {
          el.style.transform = `translate(${ball.position.x - BALL_SIZE / 2}px, ${
            ball.position.y - BALL_SIZE / 2
          }px) rotate(${ball.angle}rad)`;
        }
      });
      animationFrameId = requestAnimationFrame(render);
    }
    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
      Matter.Composite.clear(engine.world, false);
    };
  }, []);

  return (
    <div>
      <p className="font-pixel text-[8px] sm:text-[9px] text-ink/50 uppercase tracking-wider mb-2 text-center">
        Drag while you wait
      </p>
      <div
        ref={containerRef}
        className="relative w-full h-48 border-2 border-ink bg-paper-dim overflow-hidden touch-none"
      >
        {ITEMS.map((item, i) => {
          const styles = INK_STYLES[item.ink];
          const Icon = item.icon;
          return (
            <div
              key={i}
              ref={(el) => {
                ballRefs.current[i] = el;
              }}
              className={`absolute top-0 left-0 rounded-full border-2 flex items-center justify-center cursor-grab active:cursor-grabbing select-none ${styles.border} ${styles.bg}`}
              style={{ width: BALL_SIZE, height: BALL_SIZE, willChange: "transform" }}
            >
              <Icon className="w-5 h-5 text-ink pointer-events-none" strokeWidth={2.5} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
