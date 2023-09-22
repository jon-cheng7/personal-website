import clsx from 'clsx';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  bgColor?: string;
  hoverColor?: string;
  textColor?: string;
  hoverTextColor?: string;
};

export default function Button({
  bgColor = 'bg-black',
  hoverColor = 'bg-white',
  textColor = 'text-white',
  hoverTextColor = 'text-black',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'font-cygre transform rounded-full px-8 py-4 text-sm font-medium transition-all duration-300',
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
}
