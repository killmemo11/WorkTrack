export const springConfig = { type: 'spring', stiffness: 300, damping: 25, mass: 0.8 };
export const springGentle = { type: 'spring', stiffness: 200, damping: 20 };
export const springSnap = { type: 'spring', stiffness: 500, damping: 30 };
export const springBouncy = { type: 'spring', stiffness: 400, damping: 15 };

export const fadeSlideUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0, transition: springGentle },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: springConfig },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

export const staggerContainer = {
  initial: {},
  animate: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

export const staggerFast = {
  initial: {},
  animate: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
};

export const slideLeft = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0, transition: springGentle },
  exit: { opacity: 0, x: -40, transition: { duration: 0.2 } },
};

export const slideRight = {
  initial: { opacity: 0, x: -40 },
  animate: { opacity: 1, x: 0, transition: springGentle },
  exit: { opacity: 0, x: 40, transition: { duration: 0.2 } },
};

export const dropdown = {
  initial: { opacity: 0, height: 0, overflow: 'hidden' },
  animate: { opacity: 1, height: 'auto', overflow: 'visible', transition: springGentle },
  exit: { opacity: 0, height: 0, overflow: 'hidden', transition: { duration: 0.2 } },
};

export const cardHover = {
  whileHover: { y: -4, borderColor: 'rgba(99,102,241,0.3)', transition: { duration: 0.2 } },
  whileTap: { scale: 0.98 },
};

export const buttonTap = {
  whileHover: { scale: 1.02, transition: { duration: 0.15 } },
  whileTap: { scale: 0.97 },
};
