"use client";

import { useStore } from "@/store";

export function PauseMenu() {
  const { isPaused, score } = useStore();

  if (!isPaused) return null;

  return (
    <div 
      className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => {
        if (document.pointerLockElement !== document.body) {
          document.body.requestPointerLock();
        }
      }}
    >
      <div 
        className="glass-panel w-full max-w-4xl p-8 flex flex-col gap-6 animate-in fade-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex justify-between items-end border-b border-cyan-500/30 pb-4">
          <div>
            <h1 className="font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-white font-black text-4xl tracking-tighter italic glass-text">
              NOVA // COMMAND
            </h1>
            <h2 className="text-sm font-bold tracking-[0.4em] text-cyan-500 mt-1 uppercase">
              System Paused - Tactical Overview
            </h2>
          </div>
          <div className="text-right">
            <div className="text-cyan-400/70 font-mono text-xs uppercase">Available Intel (Points)</div>
            <div className="text-cyan-300 font-mono font-black text-3xl">{score.toString().padStart(5, '0')}</div>
          </div>
        </div>

        {/* Upgrade Matrix */}
        <div className="grid grid-cols-2 gap-4 mt-2">
          
          {/* Card 1: Plasmacaster */}
          <div className="bg-black/50 border border-cyan-500/40 p-4 rounded-xl relative overflow-hidden group cursor-not-allowed">
            <div className="absolute top-0 right-0 bg-cyan-500/20 text-cyan-400 text-[10px] font-mono px-2 py-1 rounded-bl-lg">ACTIVE</div>
            <h3 className="font-orbitron font-bold text-xl text-white">Plasmacaster [Lv 1]</h3>
            <p className="text-cyan-100/60 font-sans text-sm mt-2">Standard issue raycast tracking. Reliable, instant target connection.</p>
            <div className="mt-4 flex justify-between items-center">
              <span className="text-cyan-500 font-mono text-xs uppercase">Upgrade Cost: 2,500</span>
              <button className="bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 px-4 py-1.5 rounded disabled:opacity-50 font-bold text-sm tracking-wide transition-colors hover:bg-cyan-500 hover:text-black">
                UPGRADE
              </button>
            </div>
          </div>

          {/* Card 2: Shrapnel Cannon */}
          <div className="bg-black/50 border border-purple-500/20 p-4 rounded-xl relative overflow-hidden group cursor-not-allowed opacity-80">
            <div className="absolute top-0 right-0 bg-purple-500/20 text-purple-400 text-[10px] font-mono px-2 py-1 rounded-bl-lg">LOCKED</div>
            <h3 className="font-orbitron font-bold text-xl text-purple-300">Shrapnel Cannon</h3>
            <p className="text-purple-100/60 font-sans text-sm mt-2">Fires a physical spread of glowing plasma. devastating at close range.</p>
            <div className="mt-4 flex justify-between items-center">
              <span className="text-purple-500 font-mono text-xs uppercase">Unlock Cost: 5,000</span>
              <button className="bg-purple-500/10 border border-purple-500/50 text-purple-400 px-4 py-1.5 rounded disabled:opacity-50 font-bold text-sm tracking-wide transition-colors hover:bg-purple-500 hover:text-black">
                UNLOCK
              </button>
            </div>
          </div>

           {/* Card 3: Bio-Infection */}
           <div className="bg-black/50 border border-green-500/20 p-4 rounded-xl relative overflow-hidden group cursor-not-allowed opacity-80">
            <div className="absolute top-0 right-0 bg-green-500/20 text-green-400 text-[10px] font-mono px-2 py-1 rounded-bl-lg">LOCKED</div>
            <h3 className="font-orbitron font-bold text-xl text-green-300">Bio-Infection</h3>
            <p className="text-green-100/60 font-sans text-sm mt-2">Infects a target, causing them to take damage over time and spread to others.</p>
            <div className="mt-4 flex justify-between items-center">
              <span className="text-green-500 font-mono text-xs uppercase">Unlock Cost: 12,000</span>
              <button className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-1.5 rounded disabled:opacity-50 font-bold text-sm tracking-wide transition-colors hover:bg-green-500 hover:text-black">
                UNLOCK
              </button>
            </div>
          </div>

          {/* Card 4: Apocalyptic Core */}
          <div className="bg-black/50 border border-red-500/20 p-4 rounded-xl relative overflow-hidden group cursor-not-allowed opacity-80">
            <div className="absolute top-0 right-0 bg-red-500/20 text-red-400 text-[10px] font-mono px-2 py-1 rounded-bl-lg">LOCKED</div>
            <h3 className="font-orbitron font-bold text-xl text-red-400">Apocalyptic Core</h3>
            <p className="text-red-100/60 font-sans text-sm mt-2">Detonates a small-scale nuclear payload using pure GPU physics.</p>
            <div className="mt-4 flex justify-between items-center">
              <span className="text-red-500 font-mono text-xs uppercase">Unlock Cost: 50,000</span>
              <button className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-1.5 rounded disabled:opacity-50 font-bold text-sm tracking-wide transition-colors hover:bg-red-500 hover:text-black">
                UNLOCK
              </button>
            </div>
          </div>

        </div>

        {/* Footer info */}
        <div className="mt-4 text-center">
          <p className="text-cyan-400/50 font-mono text-xs tracking-widest uppercase">
            Click screen to resume simulation
          </p>
        </div>

      </div>
    </div>
  );
}