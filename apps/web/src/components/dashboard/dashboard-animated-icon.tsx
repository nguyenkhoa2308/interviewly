'use client';

import type { ElementType } from 'react';
import { useAnimateIconContext } from '@animate-ui/react/icons';
import { motion, type Variants } from 'motion/react';

const iconVariants = {
    initial: { y: 0, scale: 1, rotate: 0 },
    animate: {
        y: [0, -2, 0],
        scale: [1, 1.1, 1],
        rotate: [0, -4, 4, 0],
        transition: { duration: 0.48, ease: 'easeInOut' },
    },
} satisfies Variants;

export function DashboardAnimatedIcon({
    icon: Icon,
    className,
    name,
}: {
    icon: ElementType;
    className?: string;
    name?: string;
}) {
    const { controls } = useAnimateIconContext();
    const glyph =
        typeof Icon === 'string'
            ? Icon
            : ((Icon as { displayName?: string; name?: string }).displayName ??
              (Icon as { name?: string }).name ??
              'dashboard-icon');

    return (
        <motion.span
            className="inline-flex"
            variants={iconVariants}
            initial="initial"
            animate={controls}
            aria-hidden="true"
            data-dashboard-icon={name}
            data-dashboard-glyph={glyph}
        >
            <Icon className={className} />
        </motion.span>
    );
}
