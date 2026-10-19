import React, { useRef, useState, useEffect, useCallback } from 'react';

export default function SignaturePad({ value, onChange, label, height = 110, disabled }) {
  const canvasRef = useRef(null);
  const drawing   = useRef(false);
  const lastPos   = useRef(null);
  const [hasStroke, setHasStroke] = useState(false);

  // Load existing value onto canvas once on mount
  useEffect(() => {
    if (!value || !canvasRef.current) return;
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      setHasStroke(true);
    };
    img.src = value;
  }, []);

  function getXY(e, canvas) {
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = canvas.width  / rect.width;
    const sy = canvas.height / rect.height;
    const src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - rect.left) * sx, y: (src.clientY - rect.top) * sy };
  }

  const onDown = useCallback(e => {
    if (disabled) return;
    e.preventDefault();
    drawing.current = true;
    lastPos.current = getXY(e, canvasRef.current);
  }, [disabled]);

  const onMove = useCallback(e => {
    if (!drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getXY(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPos.current = pos;
  }, []);

  const onUp = useCallback(e => {
    if (!drawing.current) return;
    e.preventDefault();
    drawing.current = false;
    lastPos.current = null;
    setHasStroke(true);
    onChange?.(canvasRef.current.toDataURL('image/png'));
  }, [onChange]);

  function clear(e) {
    e.stopPropagation();
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setHasStroke(false);
    onChange?.(null);
  }

  return (
    <div>
      {label && (
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 5 }}>
          {label}
        </div>
      )}
      <div style={{
        position: 'relative',
        border: `0.5px solid ${disabled ? 'var(--border)' : 'var(--border2)'}`,
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        background: disabled ? 'var(--surface2)' : 'var(--bg)',
        cursor: disabled ? 'default' : 'crosshair',
      }}>
        <canvas
          ref={canvasRef}
          width={700}
          height={height * 2.5}
          style={{ width: '100%', height, display: 'block', touchAction: 'none' }}
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onMouseLeave={onUp}
          onTouchStart={onDown}
          onTouchMove={onMove}
          onTouchEnd={onUp}
        />
        {!hasStroke && !disabled && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none', userSelect: 'none',
          }}>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>
              <i className="ti ti-signature" style={{ fontSize: 14, verticalAlign: -2, marginRight: 5 }} />
              Draw signature here
            </span>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 5 }}>
        {hasStroke && !disabled && (
          <button type="button" onClick={clear} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, color: 'var(--red-text)', padding: 0,
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            <i className="ti ti-trash" style={{ fontSize: 12 }} /> Clear
          </button>
        )}
        {!hasStroke && !disabled && (
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>
            Use mouse or touch to draw
          </span>
        )}
        {hasStroke && (
          <span style={{ fontSize: 11, color: 'var(--green-text)' }}>
            <i className="ti ti-check" style={{ fontSize: 11, marginRight: 3 }} />Signature captured
          </span>
        )}
      </div>
    </div>
  );
}
