'use client';

import { demos, type Item } from '#/lib/demos';
import Link from 'next/link';
import { useSelectedLayoutSegment } from 'next/navigation';
import { MenuAlt2Icon, XIcon } from '@heroicons/react/solid';
import clsx from 'clsx';
import { useState } from 'react';
import Image from 'next/image';

export function GlobalNav() {
  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);

  return (
    <div
      id="global-nav"
      className="max-w-screen fixed top-0 z-[100] flex w-[100%] flex-col overflow-x-hidden border-b border-gray-800 bg-black"
    >
      <div className="flex h-10 items-center px-4 py-2">
        <Link href="/">
          <Image src="/Signature.png" alt="Home" width={40} height={40} />
        </Link>
      </div>
      <button
        type="button"
        className="group absolute right-0 top-0 flex h-10 items-center gap-x-2 px-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <XIcon className="block w-6 text-white" />
        ) : (
          <MenuAlt2Icon className="block w-6 text-white" />
        )}
      </button>

      <div
        className={clsx(
          'overflow-y-auto outline outline-1 outline-gray-700 transition-all duration-500 ease-in-out',
          {
            'fixed inset-x-0 top-10 mt-px max-h-[500px] w-full overflow-x-hidden bg-black opacity-100':
              isOpen,
            'max-h-0 opacity-0': !isOpen,
          },
        )}
      >
        <nav className="space-y-6 px-2 pb-24 pt-5">
          {demos.map((section) => {
            return (
              <div key={section.name}>
                <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400/80">
                  <div>{section.name}</div>
                </div>

                <div className="space-y-1">
                  {section.items.map((item) => (
                    <GlobalNavItem key={item.slug} item={item} close={close} />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function GlobalNavItem({
  item,
  close,
}: {
  item: Item;
  close: () => false | void;
}) {
  const segment = useSelectedLayoutSegment();
  const isActive = item.slug === segment;

  return (
    <Link
      onClick={close}
      href={`/${item.slug}`}
      className={clsx(
        'z-[100] block w-full overflow-x-hidden rounded-md px-3 py-2 text-sm font-medium hover:text-gray-300',
        {
          'w-full overflow-x-hidden text-gray-400 hover:bg-gray-800': !isActive,
          'text-white': isActive,
        },
      )}
    >
      {item.name}
    </Link>
  );
}
