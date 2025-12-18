import { motion } from 'motion/react';
import { useMemo } from 'react';

// 👇 1. IMPORT ĐỂ CHECK NỀN TẢNG
import { Capacitor } from '@capacitor/core';

type OrbState = 'idle' | 'listening' | 'processing' | 'speaking';

interface EnergyOrbProps {
  state: OrbState;
}

// Generate random particles
function generateParticles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 300 - 150,
    y: Math.random() * 300 - 150,
    size: Math.random() * 2 + 2,
    delay: Math.random() * 2,
    duration: Math.random() * 3 + 3,
  }));
}

export function EnergyOrb({ state }: EnergyOrbProps) {
  // 👇 2. KIỂM TRA MÔI TRƯỜNG
  const isMobile = Capacitor.isNativePlatform();

  // 👇 3. TỐI ƯU SỐ LƯỢNG HẠT
  // Mobile: 12 hạt (cho nhẹ) | Web: 40 hạt (cho đẹp)
  const particleCount = isMobile ? 12 : 40;
  
  const particles = useMemo(() => generateParticles(particleCount), [particleCount]);
  
  // Animation configs based on state
  const coreBreathing = state === 'idle' 
    ? { scale: [1, 1.08, 1], duration: 4 }
    : state === 'listening'
    ? { scale: [1, 1.12, 1], duration: 1.5 }
    : state === 'speaking'
    ? { scale: [1, 1.1, 1, 1.05, 1], duration: 1.2 }
    : { scale: [1, 0.95, 1], duration: 0.8 };

  const ringSpeed = state === 'idle' 
    ? 15
    : state === 'listening'
    ? 8
    : state === 'speaking'
    ? 10
    : 3;

  const particleSpeed = state === 'idle'
    ? 1
    : state === 'listening'
    ? 0.6
    : state === 'speaking'
    ? 0.7
    : 0.4;

  return (
    <div className="relative w-80 h-80 flex items-center justify-center">
      {/* Particle Swarm Layer (Back) */}
      <div className="absolute inset-0">
        {particles.map((particle) => {
          // Mobile: Không cần tính toán khoảng cách để tối ưu
          // Web: Giữ nguyên logic cũ nếu cần (tuy nhiên logic render ở đây không dùng distance)
          
          return (
            <motion.div
              key={particle.id}
              className="absolute rounded-full"
              style={{
                width: particle.size,
                height: particle.size,
                backgroundColor: '#A6E1FA',
                // 👇 TỐI ƯU: Mobile bỏ shadow của hạt nhỏ
                boxShadow: isMobile ? 'none' : '0 0 8px rgba(166, 225, 250, 0.8)',
                left: '50%',
                top: '50%',
                opacity: 0.6,
              }}
              animate={{
                x: [particle.x, particle.x + (Math.random() - 0.5) * 40, particle.x],
                y: [particle.y, particle.y + (Math.random() - 0.5) * 40, particle.y],
                opacity: state === 'processing' ? [0.6, 0.9, 0.6] : 0.6,
              }}
              transition={{
                duration: particle.duration * particleSpeed,
                repeat: Infinity,
                delay: particle.delay,
                ease: 'easeInOut',
              }}
            />
          );
        })}
      </div>

      {/* Connecting Lines (for processing state) */}
      {/* 👇 TỐI ƯU CỰC MẠNH: Chỉ vẽ dây nối trên WEB. Mobile tắt hẳn vì tính toán nặng */}
      {!isMobile && state === 'processing' && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.3 }}>
          {particles.slice(0, 20).map((p1, i) => {
            const p2 = particles[(i + 1) % 20];
            const distance = Math.sqrt(
              Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2)
            );
            
            if (distance < 120) {
              return (
                <motion.line
                  key={`line-${i}`}
                  x1={`${50 + (p1.x / 3)}%`}
                  y1={`${50 + (p1.y / 3)}%`}
                  x2={`${50 + (p2.x / 3)}%`}
                  y2={`${50 + (p2.y / 3)}%`}
                  stroke="#3498DB"
                  strokeWidth="0.5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.6, 0] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.1,
                  }}
                />
              );
            }
            return null;
          })}
        </svg>
      )}

      {/* Wavy Ring 1 (Outer) */}
      <motion.div
        className="absolute"
        style={{ width: 280, height: 280 }}
        animate={{ 
          rotate: state === 'processing' ? [0, 360, 0, -360, 0] : 360 
        }}
        transition={{
          duration: state === 'processing' ? 6 : ringSpeed,
          repeat: Infinity,
          ease: state === 'processing' ? 'easeInOut' : 'linear',
        }}
      >
        <svg width="280" height="280" viewBox="0 0 280 280" fill="none">
          <motion.ellipse
            cx="140"
            cy="140"
            rx="135"
            ry="138"
            stroke="url(#gradient1)"
            strokeWidth="2"
            opacity="0.6"
            fill="none"
            animate={
              state === 'listening' 
                ? { 
                    strokeWidth: [2, 3, 2],
                    opacity: [0.6, 0.9, 0.6],
                  }
                : state === 'speaking'
                ? {
                    strokeWidth: [2, 3.5, 2, 3, 2],
                    opacity: [0.6, 0.95, 0.6, 0.85, 0.6],
                    rx: [135, 138, 135, 137, 135],
                    ry: [138, 135, 138, 136, 138],
                  }
                : {}
            }
            transition={{
              duration: state === 'speaking' ? 1.2 : 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <defs>
            <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3498DB" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#A6E1FA" stopOpacity="1" />
              <stop offset="100%" stopColor="#3498DB" stopOpacity="0.8" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      {/* Wavy Ring 2 (Middle) */}
      <motion.div
        className="absolute"
        style={{ width: 230, height: 230 }}
        animate={{ 
          rotate: state === 'processing' ? [0, -360, 0, 360, 0] : -360 
        }}
        transition={{
          duration: state === 'processing' ? 5 : ringSpeed * 1.3,
          repeat: Infinity,
          ease: state === 'processing' ? 'easeInOut' : 'linear',
        }}
      >
        <svg width="230" height="230" viewBox="0 0 230 230" fill="none">
          <motion.path
            d="M 115,10 Q 180,50 210,115 T 115,220 Q 50,180 20,115 T 115,10"
            stroke="url(#gradient2)"
            strokeWidth="2.5"
            opacity="0.7"
            fill="none"
            animate={
              state === 'listening'
                ? {
                    strokeWidth: [2.5, 4, 2.5],
                    opacity: [0.7, 1, 0.7],
                  }
                : state === 'speaking'
                ? {
                    strokeWidth: [2.5, 4.5, 2.5, 3.5, 2.5],
                    opacity: [0.7, 1, 0.7, 0.9, 0.7],
                  }
                : {}
            }
            transition={{
              duration: state === 'speaking' ? 1.2 : 1.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <defs>
            <linearGradient id="gradient2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#A6E1FA" stopOpacity="1" />
              <stop offset="50%" stopColor="#3498DB" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#A6E1FA" stopOpacity="1" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      {/* Wavy Ring 3 (Inner) */}
      <motion.div
        className="absolute"
        style={{ width: 200, height: 200 }}
        animate={{ 
          rotate: state === 'processing' ? [0, 360, 0, -360, 0] : 360 
        }}
        transition={{
          duration: state === 'processing' ? 4 : ringSpeed * 0.8,
          repeat: Infinity,
          ease: state === 'processing' ? 'easeInOut' : 'linear',
        }}
      >
        <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
          <motion.ellipse
            cx="100"
            cy="100"
            rx="92"
            ry="96"
            stroke="url(#gradient3)"
            strokeWidth="1.5"
            opacity="0.5"
            fill="none"
            animate={
              state === 'listening'
                ? {
                    strokeWidth: [1.5, 2.5, 1.5],
                    opacity: [0.5, 0.8, 0.5],
                  }
                : state === 'speaking'
                ? {
                    strokeWidth: [1.5, 3, 1.5, 2.5, 1.5],
                    opacity: [0.5, 0.9, 0.5, 0.8, 0.5],
                    rx: [92, 95, 92, 94, 92],
                    ry: [96, 93, 96, 94, 96],
                  }
                : {}
            }
            transition={{
              duration: state === 'speaking' ? 1.2 : 2.2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <defs>
            <linearGradient id="gradient3" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3498DB" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#A6E1FA" stopOpacity="1" />
              <stop offset="100%" stopColor="#1F3B4D" stopOpacity="0.6" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      {/* Core Energy Orb */}
      <motion.div
        className="absolute w-40 h-40 rounded-full"
        style={{
          background: 'radial-gradient(circle, #007BFF 0%, #0056B3 100%)',
          // 👇 TỐI ƯU CỰC MẠNH: Mobile tắt Glow/Shadow lớn để giảm nóng máy
          boxShadow: isMobile 
            ? 'none' // Mobile: Không shadow
            : `0 0 40px rgba(0, 123, 255, 0.6), inset 0 0 60px rgba(255, 255, 255, 0.3)`, // Web: Full Glow
        }}
        animate={{
          scale: coreBreathing.scale,
          // 👇 TỐI ƯU ANIMATION SHADOW
          boxShadow: isMobile 
            ? 'none' // Mobile không animate shadow
            : state === 'listening'
            ? [
                '0 0 40px rgba(0, 123, 255, 0.6), inset 0 0 60px rgba(255, 255, 255, 0.3)',
                '0 0 60px rgba(0, 123, 255, 0.9), inset 0 0 80px rgba(255, 255, 255, 0.5)',
                '0 0 40px rgba(0, 123, 255, 0.6), inset 0 0 60px rgba(255, 255, 255, 0.3)',
              ]
            : state === 'processing'
            ? [
                '0 0 40px rgba(0, 123, 255, 0.6), inset 0 0 60px rgba(255, 255, 255, 0.3)',
                '0 0 30px rgba(0, 86, 179, 0.8), inset 0 0 40px rgba(255, 255, 255, 0.2)',
                '0 0 40px rgba(0, 123, 255, 0.6), inset 0 0 60px rgba(255, 255, 255, 0.3)',
              ]
            : '0 0 40px rgba(0, 123, 255, 0.6), inset 0 0 60px rgba(255, 255, 255, 0.3)',
        }}
        transition={{
          duration: coreBreathing.duration,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Listening - Additional Sound Ripples */}
      {state === 'listening' && (
        <>
          {[0, 1, 2].map((index) => (
            <motion.div
              key={`ripple-${index}`}
              className="absolute w-40 h-40 rounded-full border-2"
              style={{
                borderColor: '#3498DB',
              }}
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{
                scale: [1, 3],
                opacity: [0.8, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: index * 0.6,
                ease: 'easeOut',
              }}
            />
          ))}
        </>
      )}

      {/* Speaking - Voice Wave Pulses */}
      {state === 'speaking' && (
        <>
          {[0, 1, 2, 3].map((index) => (
            <motion.div
              key={`voice-wave-${index}`}
              className="absolute w-40 h-40 rounded-full"
              style={{
                border: '2px solid',
                borderColor: index % 2 === 0 ? '#A6E1FA' : '#3498DB',
              }}
              initial={{ scale: 1, opacity: 0.7 }}
              animate={{
                scale: [1, 2.8],
                opacity: [0.7, 0],
              }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                delay: index * 0.4,
                ease: 'easeOut',
              }}
            />
          ))}
        </>
      )}

      {/* Particle Swarm Layer (Front - overlaying particles) */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.slice(0, 15).map((particle) => (
          <motion.div
            key={`front-${particle.id}`}
            className="absolute rounded-full"
            style={{
              width: particle.size * 1.5,
              height: particle.size * 1.5,
              backgroundColor: '#FFFFFF',
              boxShadow: isMobile ? 'none' : '0 0 10px rgba(255, 255, 255, 0.9)',
              left: '50%',
              top: '50%',
              opacity: 0.4,
            }}
            animate={{
              x: [
                particle.x * 0.7,
                particle.x * 0.7 + (Math.random() - 0.5) * 30,
                particle.x * 0.7,
              ],
              y: [
                particle.y * 0.7,
                particle.y * 0.7 + (Math.random() - 0.5) * 30,
                particle.y * 0.7,
              ],
              opacity: [0.4, 0.8, 0.4],
            }}
            transition={{
              duration: particle.duration * particleSpeed * 0.8,
              repeat: Infinity,
              delay: particle.delay + 0.5,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </div>
  );
}