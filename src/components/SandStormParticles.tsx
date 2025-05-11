"use client";
import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  color: string;
}

export default function SandstormParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);

  const createParticles = (canvas: HTMLCanvasElement) => {
    const particles: Particle[] = [];
    const particleCount = 200;

    // Sand colors ranging from light tan to darker brown
    const sandColors = [
      "#e6c288",
      "#d4b37f",
      "#c19a6b",
      "#aa8855",
      "#9c7a45",
      "#8b6914",
    ];

    for (let i = 0; i < particleCount; i++) {
      // Spread out over the right of the canvas
      particles.push({
        x: canvas.width + Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1, // Particles of different sizes
        speed: Math.random() * 2 + 1, // Different speeds for varied movement
        opacity: Math.random() * 0.7 + 0.3, // Varied opacity for depth
        color: sandColors[Math.floor(Math.random() * sandColors.length)],
      });
    }

    return particles;
  };

  const updateAndDrawParticles = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    particles: Particle[],
  ) => {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and draw each particle
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Move particle from right to left
      p.x -= p.speed;

      // Add some vertical drift to simulate wind
      p.y += (Math.random() - 0.5) * 1.5;

      // Reset particle when it goes off screen
      if (p.x < -10) {
        p.x = canvas.width + Math.random() * 20;
        p.y = Math.random() * canvas.height;
      }

      // Keep particles within vertical bounds
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      // Draw the particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity;
      ctx.fill();
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions to match container
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;

        // Re-create particles when canvas is resized
        particlesRef.current = createParticles(canvas);
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Initialize particles
    particlesRef.current = createParticles(canvas);

    // Animation loop
    const animate = () => {
      updateAndDrawParticles(ctx, canvas, particlesRef.current);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" />
  );
}
