import React from 'react';
import { useCustomCursor } from '../hooks/useCustomCursor';

/**
 * Global custom cursor layer.
 * Rendered once at the app root so it works on every view (intro, tips, materials, etc.).
 *
 * NOTE: The hook internally enables itself only for fine pointers:
 * (hover:hover) and (pointer:fine). On touch devices this component remains inert.
 */
const GlobalCursor: React.FC = () => {
  const { cursorDotRef, cursorOutlineRef, cursorReactorRef } = useCustomCursor();

  return (
    <>
      <div className="cursor-reactor" ref={cursorReactorRef} data-cursor-reactor />
      <div className="cursor-dot" ref={cursorDotRef} data-cursor />
      <div className="cursor-outline" ref={cursorOutlineRef} data-cursor-outline />
    </>
  );
};

export default React.memo(GlobalCursor);
