import clsx from 'clsx';
import Link from 'next/link';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  bgColor?: string;
  hoverColor?: string;
  textColor?: string;
  hoverTextColor?: string;
  route?: string;
};
export default function Button({
  bgColor = 'bg-black',
  hoverColor = 'bg-white',
  textColor = 'text-white',
  hoverTextColor = 'text-black',
  className,
  route, // Destructure the new route prop
  ...props
}: ButtonProps) {
  const buttonContent = (
    <button
      className={clsx(
        'font-cygre flex transform items-center justify-center rounded-full px-8 py-4 text-sm font-medium leading-none transition-all duration-300',
        bgColor,
        textColor,
        {
          [`hover:${hoverColor}`]: hoverColor,
          [`hover:${hoverTextColor}`]: hoverTextColor,
          'hover:scale-105': true,
          'active:scale-95': true,
        },
        className,
      )}
      {...props}
    />
  );

  return route ? <Link href={route}>{buttonContent}</Link> : buttonContent;
}
