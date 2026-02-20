/**
 * Обёртка для панели «Инспектор Пользы»: эффект вогнутого монитора
 * (цилиндрическая проекция, меш из N вертикальных полос).
 * Один корневой div в потоке — ref и размер стабильны.
 *
 * Каждая полоса получает полностью независимую копию контента (глубокое клонирование),
 * иначе React оставляет один экземпляр в дереве и контент виден только в одной полосе / исчезает.
 */

import React, { useRef, useState, useEffect, Children, cloneElement, isValidElement } from 'react';
import {
  getCylinderStripQuads,
  getCylinderStripTransforms,
  type CylinderParams,
} from '../utils/cabinCylinderProjection';

const DEFAULT_STRIPS = 20;
const DEFAULT_SAG = 14;

/** Рекурсивно клонирует дерево элементов с уникальными ключами для полосы — чтобы React не объединял экземпляры */
function deepCloneForStrip(
  child: React.ReactNode,
  stripId: number,
  path: string
): React.ReactNode {
  if (child == null || typeof child !== 'object') return child;
  if (!isValidElement(child)) return child;

  const key = `s${stripId}-${path}`;
  const props = (child.props as Record<string, unknown>) || {};
  const childChildren = props.children;

  const newChildren =
    childChildren === undefined || childChildren === null
      ? undefined
      : Children.map(childChildren, (c, i) =>
          deepCloneForStrip(c as React.ReactNode, stripId, `${path}-${i}`)
        );

  return cloneElement(
    child as React.ReactElement<{ key?: string }>,
    { key, ...(newChildren !== undefined ? { children: newChildren } : {}) }
  );
}

export interface InspectorMonitorCurveProps {
  children: React.ReactNode;
  /** Включить эффект кривизны (false = плоская панель, контент всегда виден) */
  curve?: boolean;
  /** Число вертикальных полос */
  strips?: number;
  /** Стрела прогиба (px) */
  sag?: number;
  className?: string;
}

export function InspectorMonitorCurve({
  children,
  curve = false,
  strips: N = DEFAULT_STRIPS,
  sag = DEFAULT_SAG,
  className = '',
}: InspectorMonitorCurveProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [curveReady, setCurveReady] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width >= 10 && height >= 10) {
        const next = { w: Math.round(width), h: Math.round(height) };
        setSize((prev) =>
          prev && prev.w === next.w && prev.h === next.h ? prev : next
        );
      } else {
        setSize(null);
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!curve || !size) return;
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => setCurveReady(true));
    });
    return () => cancelAnimationFrame(t);
  }, [curve, size?.w, size?.h]);

  const curveEnabled =
    curve && curveReady && size !== null && size.w >= 50 && size.h >= 20;
  const W = size?.w ?? 0;
  const H = size?.h ?? 0;

  const rootStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    minHeight: 0,
    overflow: curveEnabled ? 'hidden' : 'visible',
  };

  return (
    <div ref={wrapRef} className={className} style={rootStyle}>
      {!curveEnabled && (
        <div className="profile-view-cabin-inspector-monitor__strip-content">
          {children}
        </div>
      )}

      {curveEnabled && W > 0 && H > 0 && (() => {
        const params: CylinderParams = { W, H, N, s: sag };
        const quads = getCylinderStripQuads(params);
        const transforms = getCylinderStripTransforms(params);

        const clamp = (v: number) => Math.max(0, Math.min(100, v));
        return transforms.map((matrix3d, j) => {
          const q = quads[j];
          const clipPath = `polygon(${q.map((p) => `${clamp((p.x / W) * 100)}% ${clamp((p.y / H) * 100)}%`).join(', ')})`;
          const sliceLeft = (j * W) / N;

          return (
            <div
              key={j}
              className="profile-view-cabin-inspector-monitor__strip"
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: W,
                height: H,
                clipPath,
                WebkitClipPath: clipPath,
                pointerEvents: 'auto',
              }}
            >
              <div
                className="profile-view-cabin-inspector-monitor__strip-content"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: W,
                  height: H,
                  transformOrigin: '0 0',
                  transform: `translate(${-sliceLeft}px, 0) ${matrix3d}`,
                  pointerEvents: 'none',
                }}
              >
                {Children.map(children, (child, i) =>
                  deepCloneForStrip(child, j, String(i))
                )}
              </div>
            </div>
          );
        });
      })()}
    </div>
  );
}
