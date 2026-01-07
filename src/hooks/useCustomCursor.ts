import { useEffect, useRef } from 'react';

export const useCustomCursor = () => {
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const cursorOutlineRef = useRef<HTMLDivElement>(null);
  const cursorReactorRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mouseXRef = useRef<number>(0);
  const mouseYRef = useRef<number>(0);
  const outlineXRef = useRef<number>(0);
  const outlineYRef = useRef<number>(0);
  const reactorXRef = useRef<number>(0);
  const reactorYRef = useRef<number>(0);
  const currentHoverTargetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Disable custom cursor on touch devices
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      return;
    }

    // Initialize positions
    mouseXRef.current = window.innerWidth / 2;
    mouseYRef.current = window.innerHeight / 2;
    outlineXRef.current = mouseXRef.current;
    outlineYRef.current = mouseYRef.current;
    reactorXRef.current = mouseXRef.current;
    reactorYRef.current = mouseYRef.current;

    const cursorDot = cursorDotRef.current;
    const cursorOutline = cursorOutlineRef.current;
    const cursorReactor = cursorReactorRef.current;

    if (!cursorDot || !cursorOutline) return;

    // Set initial positions
    cursorDot.style.left = `${mouseXRef.current}px`;
    cursorDot.style.top = `${mouseYRef.current}px`;
    cursorOutline.style.left = `${outlineXRef.current}px`;
    cursorOutline.style.top = `${outlineYRef.current}px`;
    if (cursorReactor) {
      cursorReactor.style.left = `${reactorXRef.current}px`;
      cursorReactor.style.top = `${reactorYRef.current}px`;
    }

    const outlineEase = 0.22;
    const reactorEase = 0.12;
    const cursorOutlineRadius = 20;

    // Function to check collision between circle and element
    // For block-level elements, checks only the text area, not the full element width
    const checkCollision = (circleX: number, circleY: number, circleRadius: number, element: HTMLElement): boolean => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      
      // For block-level and inline-block elements (like .hero-title span), check only text area
      // Also check if element is inside .hero-title (all spans there should use text area check)
      const isBlockLevel = style.display === 'block' || style.display === 'flex';
      const isInlineBlock = style.display === 'inline-block';
      const isInHeroTitle = element.closest('.hero-title') !== null;
      
      // Apply text area check for block/inline-block elements or elements inside .hero-title
      if ((isBlockLevel || isInlineBlock || isInHeroTitle) && element.textContent && element.textContent.trim()) {
        // Use Range API to get exact text boundaries (more accurate than canvas measurement)
        try {
          const range = document.createRange();
          // Select all text content of the element
          range.selectNodeContents(element);
          
          // Get the bounding rect of the actual text (not the element)
          const textRects = range.getClientRects();
          
          if (textRects.length > 0) {
            // Use the first (and usually only) text rectangle
            // This gives us the exact rendered boundaries of the text
            const textRect = textRects[0];
            
            // For elements with -webkit-text-stroke, we may need to account for stroke width
            const computedStyle = window.getComputedStyle(element);
            const textStroke = (style as any).webkitTextStroke || 
                              computedStyle.getPropertyValue('-webkit-text-stroke') || 
                              style.getPropertyValue('-webkit-text-stroke') || '';
            
            let textStart = textRect.left;
            let textEnd = textRect.right;
            
            // For elements with -webkit-text-stroke, add stroke width to boundaries
            if (textStroke && textStroke !== 'none' && textStroke !== '0px' && textStroke.trim() !== '') {
              const strokeMatch = textStroke.match(/(\d+(?:\.\d+)?)px/);
              if (strokeMatch) {
                const strokeWidth = parseFloat(strokeMatch[1]) || 0;
                // Add stroke width to both sides
                textStart -= strokeWidth;
                textEnd += strokeWidth;
              }
            }
            
            // First check: cursor must be within horizontal text boundaries
            // If cursor is outside textStart/textEnd, return false immediately
            if (circleX < textStart || circleX > textEnd) {
              return false;
            }
            
            // Check if cursor is within the actual text area vertically
            const textTop = textRect.top;
            const textBottom = textRect.bottom;
            
            // Second check: cursor must be within vertical text boundaries
            if (circleY < textTop || circleY > textBottom) {
              return false;
            }
            
            // If cursor is within text boundaries, check distance to text area
            const closestX = Math.max(textStart, Math.min(circleX, textEnd));
            const closestY = Math.max(textTop, Math.min(circleY, textBottom));
            const distance = Math.sqrt(
              Math.pow(circleX - closestX, 2) + Math.pow(circleY - closestY, 2)
            );
            return distance <= circleRadius;
          }
        } catch (e) {
          // Fallback to canvas measurement if Range API fails
        }
        
        // Fallback: Calculate actual text width using canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (context) {
          // Get computed font properties - use getPropertyValue for more accurate values
          const computedStyle = window.getComputedStyle(element);
          // Use fontSize property directly (already in pixels) for more accurate measurement
          const fontSize = computedStyle.fontSize || computedStyle.getPropertyValue('font-size') || style.fontSize || '16px';
          const fontFamily = computedStyle.fontFamily || computedStyle.getPropertyValue('font-family') || style.fontFamily || 'inherit';
          const fontWeight = computedStyle.fontWeight || computedStyle.getPropertyValue('font-weight') || style.fontWeight || 'normal';
          const fontStyle = computedStyle.fontStyle || computedStyle.getPropertyValue('font-style') || style.fontStyle || 'normal';
          
          // Build font string for canvas
          context.font = `${fontStyle} ${fontWeight} ${fontSize} ${fontFamily}`;
          
          // Measure text width - use trimmed text content
          const textContent = element.textContent.trim();
          let textWidth = context.measureText(textContent).width;
          
          // For elements with -webkit-text-stroke (like .highlight), add stroke width to measurement
          const textStroke = (style as any).webkitTextStroke || 
                            computedStyle.getPropertyValue('-webkit-text-stroke') || 
                            style.getPropertyValue('-webkit-text-stroke') || '';
          
          if (textStroke && textStroke !== 'none' && textStroke !== '0px' && textStroke.trim() !== '') {
            // Parse stroke width (format: "2px color" or just "2px")
            const strokeMatch = textStroke.match(/(\d+(?:\.\d+)?)px/);
            if (strokeMatch) {
              const strokeWidth = parseFloat(strokeMatch[1]) || 0;
              // Add stroke width to both sides for accurate measurement
              textWidth += strokeWidth * 2;
            }
          }
          
          // Get text alignment
          const textAlign = style.textAlign || 'left';
          let textStart: number;
          
          if (textAlign === 'center') {
            textStart = rect.left + (rect.width - textWidth) / 2;
          } else if (textAlign === 'right') {
            textStart = rect.right - textWidth;
          } else {
            // left or default
            const paddingLeft = parseFloat(style.paddingLeft) || 0;
            textStart = rect.left + paddingLeft;
          }
          
          // Calculate text boundaries - do NOT add tolerance to the right side
          const textEnd = textStart + textWidth;
          
          // First check: cursor must be within horizontal text boundaries
          if (circleX < textStart || circleX > textEnd) {
            return false;
          }
          
          // Check if cursor is within the actual text area vertically
          const lineHeight = parseFloat(style.lineHeight) || parseFloat(fontSize);
          const paddingTop = parseFloat(style.paddingTop) || 0;
          const textTop = rect.top + paddingTop;
          const textBottom = textTop + lineHeight;
          
          // Second check: cursor must be within vertical text boundaries
          if (circleY < textTop || circleY > textBottom) {
            return false;
          }
          
          // If cursor is within text boundaries, check distance to text area
          const textRect = {
            left: textStart,
            right: textEnd,
            top: textTop,
            bottom: textBottom
          };
          
          const closestX = Math.max(textRect.left, Math.min(circleX, textRect.right));
          const closestY = Math.max(textRect.top, Math.min(circleY, textRect.bottom));
          const distance = Math.sqrt(
            Math.pow(circleX - closestX, 2) + Math.pow(circleY - closestY, 2)
          );
          return distance <= circleRadius;
        }
      }
      
      // For non-block elements, use standard collision check
      const closestX = Math.max(rect.left, Math.min(circleX, rect.right));
      const closestY = Math.max(rect.top, Math.min(circleY, rect.bottom));
      const distance = Math.sqrt(
        Math.pow(circleX - closestX, 2) + Math.pow(circleY - closestY, 2)
      );
      return distance <= circleRadius;
    };

    // Function to check if point is over visible text (not empty space)
    const isOverText = (x: number, y: number, element: HTMLElement): boolean => {
      // Check if element contains text
      if (!element.textContent || !element.textContent.trim()) {
        return false;
      }

      // Use Range API to check if point is over actual text characters
      if (document.caretRangeFromPoint) {
        try {
          const range = document.caretRangeFromPoint(x, y);
          if (range) {
            // Check if the range is within our element
            const isInElement = element.contains(range.commonAncestorContainer as Node);
            if (!isInElement) {
              return false;
            }
            
            // Check if range is not collapsed (meaning there's actual text)
            // Also check if we're not in whitespace between text nodes
            const textNode = range.startContainer;
            if (textNode.nodeType === Node.TEXT_NODE) {
              const text = textNode.textContent || '';
              const offset = range.startOffset;
              
              // Check if the character at this position is not whitespace
              if (offset < text.length && text[offset] && text[offset].trim().length > 0) {
                return true;
              }
              // Check character before cursor (within reasonable distance)
              if (offset > 0 && offset <= text.length && text[offset - 1] && text[offset - 1].trim().length > 0) {
                return true;
              }
              // Check character after cursor (within reasonable distance)
              if (offset < text.length - 1 && text[offset + 1] && text[offset + 1].trim().length > 0) {
                return true;
              }
            }
            
            // If range is not collapsed, there's text selected
            if (!range.collapsed) {
              return true;
            }
          }
        } catch (e) {
          // Fallback if caretRangeFromPoint fails
        }
      }

      // For block-level elements (like .hero-title span), calculate actual text width
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      
      // Check if element is block-level (like .hero-title span)
      const isBlockLevel = style.display === 'block' || style.display === 'flex';
      
      if (isBlockLevel) {
        // Use Range API to get exact text boundaries - same logic as checkCollision
        try {
          const range = document.createRange();
          // Select all text content of the element
          range.selectNodeContents(element);
          
          // Get the bounding rect of the actual text (not the element)
          const textRects = range.getClientRects();
          
          if (textRects.length > 0) {
            // Use the first (and usually only) text rectangle
            const textRect = textRects[0];
            
            // For elements with -webkit-text-stroke, account for stroke width
            const computedStyle = window.getComputedStyle(element);
            const textStroke = (style as any).webkitTextStroke || 
                              computedStyle.getPropertyValue('-webkit-text-stroke') || 
                              style.getPropertyValue('-webkit-text-stroke') || '';
            
            let textStart = textRect.left;
            let textEnd = textRect.right;
            
            // For elements with -webkit-text-stroke, add stroke width to boundaries
            if (textStroke && textStroke !== 'none' && textStroke !== '0px' && textStroke.trim() !== '') {
              const strokeMatch = textStroke.match(/(\d+(?:\.\d+)?)px/);
              if (strokeMatch) {
                const strokeWidth = parseFloat(strokeMatch[1]) || 0;
                // Add stroke width to both sides
                textStart -= strokeWidth;
                textEnd += strokeWidth;
              }
            }
            
            // Check if cursor is within the actual text area horizontally and vertically
            if (x >= textStart && x <= textEnd && y >= textRect.top && y <= textRect.bottom) {
              return true;
            }
            
            return false;
          }
        } catch (e) {
          // Fallback to canvas measurement if Range API fails
        }
        
        // Fallback: Calculate actual text width using canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (context) {
          // Get computed font properties - use same approach as checkCollision
          const computedStyle = window.getComputedStyle(element);
          const fontSize = computedStyle.getPropertyValue('font-size') || style.fontSize || '16px';
          const fontFamily = computedStyle.getPropertyValue('font-family') || style.fontFamily || 'inherit';
          const fontWeight = computedStyle.getPropertyValue('font-weight') || style.fontWeight || 'normal';
          const fontStyle = computedStyle.getPropertyValue('font-style') || style.fontStyle || 'normal';
          
          context.font = `${fontStyle} ${fontWeight} ${fontSize} ${fontFamily}`;
          
          // Measure text width - use trimmed text content (same as checkCollision)
          const textContent = (element.textContent || '').trim();
          let textWidth = context.measureText(textContent).width;
          
          // For elements with -webkit-text-stroke (like .highlight), add stroke width to measurement
          // Use same logic as checkCollision
          const textStroke = (style as any).webkitTextStroke || 
                            computedStyle.getPropertyValue('-webkit-text-stroke') || 
                            style.getPropertyValue('-webkit-text-stroke') || '';
          
          if (textStroke && textStroke !== 'none' && textStroke !== '0px' && textStroke.trim() !== '') {
            // Parse stroke width (format: "2px color" or just "2px")
            const strokeMatch = textStroke.match(/(\d+(?:\.\d+)?)px/);
            if (strokeMatch) {
              const strokeWidth = parseFloat(strokeMatch[1]) || 0;
              // Add stroke width to both sides for accurate measurement
              textWidth += strokeWidth * 2;
            }
          }
          
          // Get text alignment - use same logic as checkCollision
          const textAlign = computedStyle.getPropertyValue('text-align') || style.textAlign || 'left';
          let textStart: number;
          
          if (textAlign === 'center') {
            textStart = rect.left + (rect.width - textWidth) / 2;
          } else if (textAlign === 'right') {
            textStart = rect.right - textWidth;
          } else {
            // left or default
            const paddingLeft = parseFloat(computedStyle.getPropertyValue('padding-left')) || parseFloat(style.paddingLeft) || 0;
            textStart = rect.left + paddingLeft;
          }
          
          const textEnd = textStart + textWidth;
          
          // Check if cursor is within the actual text area horizontally and vertically
          const lineHeight = parseFloat(computedStyle.getPropertyValue('line-height')) || parseFloat(style.lineHeight) || parseFloat(fontSize);
          const paddingTop = parseFloat(computedStyle.getPropertyValue('padding-top')) || parseFloat(style.paddingTop) || 0;
          const textTop = rect.top + paddingTop;
          const textBottom = textTop + lineHeight;
          
          if (x >= textStart && x <= textEnd && y >= textTop && y <= textBottom) {
            return true;
          }
          
          return false;
        }
      }

      // Fallback: use elementFromPoint to check what's actually under the cursor
      const elementAtPoint = document.elementFromPoint(x, y);
      if (elementAtPoint && (elementAtPoint === element || element.contains(elementAtPoint))) {
        // Check if the element at point has text
        const text = elementAtPoint.textContent || '';
        if (text.trim().length > 0) {
          return true;
        }
      }

      return false;
    };

    // Handle mouse move
    const handleMouseMove = (e: MouseEvent) => {
      mouseXRef.current = e.clientX;
      mouseYRef.current = e.clientY;

      // Dot follows immediately
      if (cursorDot) {
        cursorDot.style.left = `${mouseXRef.current}px`;
        cursorDot.style.top = `${mouseYRef.current}px`;
      }
    };

    // Update cursor animation
    const updateCursor = () => {
      if (!cursorOutline) return;

      // Smooth interpolation for outline
      outlineXRef.current += (mouseXRef.current - outlineXRef.current) * outlineEase;
      outlineYRef.current += (mouseYRef.current - outlineYRef.current) * outlineEase;
      cursorOutline.style.left = `${outlineXRef.current}px`;
      cursorOutline.style.top = `${outlineYRef.current}px`;

      // Smooth interpolation for reactor
      if (cursorReactor) {
        reactorXRef.current += (mouseXRef.current - reactorXRef.current) * reactorEase;
        reactorYRef.current += (mouseYRef.current - reactorYRef.current) * reactorEase;
        cursorReactor.style.left = `${reactorXRef.current}px`;
        cursorReactor.style.top = `${reactorYRef.current}px`;
      }

      // Check collision with hover targets
      // В hero секции реагируем на span элементы внутри .hero-title (буквы текста)
      // В marquee секции реагируем на .marquee-item с классом hover-target
      // В остальных секциях реагируем на обычные элементы
      const allHoverTargets = document.querySelectorAll<HTMLElement>(
        '.hover-target, p, h1, h2, h3, h4, h5, h6, span, a, li, .subtitle-text, .manifesto-statement, .feature-card h3, .feature-card p'
      );

      let foundTarget: HTMLElement | null = null;
      allHoverTargets.forEach((target) => {
        const style = window.getComputedStyle(target);
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          style.pointerEvents === 'none' ||
          target.offsetWidth === 0 ||
          target.offsetHeight === 0
        ) {
          return;
        }

        // Skip if element has no text content or only whitespace
        if (!target.textContent || !target.textContent.trim()) {
          return;
        }

        // В hero секции реагируем на span элементы внутри .hero-title (буквы текста)
        const heroSection = target.closest('.hero');
        if (heroSection) {
          const heroTitle = target.closest('.hero-title');
          if (heroTitle) {
            // Если это сам .hero-title, пропускаем (он слишком большой)
            if (target.classList.contains('hero-title')) {
              return;
            }
            // Проверяем только прямые дочерние span элементы .hero-title
            if (target.tagName === 'SPAN' && target.parentElement === heroTitle) {
              // Это span с текстом внутри .hero-title - проверяем коллизию с реальной позицией мыши
              // Используем реальные координаты мыши для более точной проверки
              if (checkCollision(mouseXRef.current, mouseYRef.current, cursorOutlineRadius, target)) {
                // Дополнительная проверка: курсор должен быть над видимым текстом, а не над пустым пространством
                if (isOverText(mouseXRef.current, mouseYRef.current, target)) {
                  foundTarget = target;
                }
              }
            }
          } else {
            // Элемент в hero, но не внутри .hero-title - пропускаем
            return;
          }
          return; // Не проверяем дальше для hero секции
        }

        // В marquee секции реагируем только на .marquee-item с классом hover-target
        const marqueeSection = target.closest('.marquee');
        if (marqueeSection) {
          // Пропускаем все элементы внутри marquee, кроме .marquee-item с классом hover-target
          if (!target.classList.contains('marquee-item') || !target.classList.contains('hover-target')) {
            return;
          }
        }

        if (checkCollision(outlineXRef.current, outlineYRef.current, cursorOutlineRadius, target)) {
          foundTarget = target;
        }
      });

      // Update cursor hover state based on collision
      if (foundTarget && currentHoverTargetRef.current !== foundTarget) {
        cursorOutline.classList.add('cursor-hover');
        if (cursorReactor) {
          cursorReactor.classList.add('cursor-reactor-active');
        }
        currentHoverTargetRef.current = foundTarget;
      } else if (!foundTarget && currentHoverTargetRef.current) {
        cursorOutline.classList.remove('cursor-hover');
        if (cursorReactor) {
          cursorReactor.classList.remove('cursor-reactor-active');
        }
        currentHoverTargetRef.current = null;
      }

      animationFrameRef.current = requestAnimationFrame(updateCursor);
    };

    window.addEventListener('mousemove', handleMouseMove);
    updateCursor();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    cursorDotRef,
    cursorOutlineRef,
    cursorReactorRef,
  };
};

