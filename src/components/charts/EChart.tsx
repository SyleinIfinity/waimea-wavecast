import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface EChartProps {
  options: echarts.EChartsOption;
  height?: string | number;
  width?: string | number;
  className?: string;
  onEvents?: Record<string, (params: unknown) => void>;
}

export default function EChart({
  options,
  height = '350px',
  width = '100%',
  className = '',
  onEvents,
}: EChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!instanceRef.current) {
      instanceRef.current = echarts.init(chartRef.current, 'dark', {
        renderer: 'svg',
      });

      if (onEvents) {
        Object.entries(onEvents).forEach(([eventName, handler]) => {
          instanceRef.current?.on(eventName, handler);
        });
      }
    }

    instanceRef.current.setOption(
      {
        backgroundColor: 'transparent',
        ...options,
      },
      true
    );

    const handleResize = () => {
      instanceRef.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [options, onEvents]);

  useEffect(() => {
    return () => {
      if (instanceRef.current) {
        instanceRef.current.dispose();
        instanceRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={chartRef}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
      className={className}
    />
  );
}
