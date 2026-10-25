import type { MouseEventHandler } from 'react';
import listSVGIcon from './icons';

export interface SvgIconProps {
  name: string;
  className?: string;
  onClick?: MouseEventHandler<HTMLSpanElement>;
  fill?: string;
  style?: object;
  antMode?: boolean;
}
export default function SvgIcon(props: SvgIconProps) {
  const { className = '', name, ...rest } = props;
  const iconElement = listSVGIcon[name];
  // console.log("token", token)

  if (!iconElement) return null;
  return (
    <span
      className={`d-flex align-item-center justify-content-center ${className}`}
      {...rest}
    >
      {iconElement}
    </span>
  );
}
