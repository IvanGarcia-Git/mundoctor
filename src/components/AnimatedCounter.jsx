
import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

const AnimatedCounter = ({ to }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, latest => Math.round(latest));
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    if (isInView) {
      const controls = animate(count, to, { 
        duration: 1.5, 
        ease: "easeOut" 
      });
      return controls.stop;
    }
  }, [to, count, isInView]);
  
  return (
    <motion.span
      onViewportEnter={() => setIsInView(true)}
      onViewportLeave={() => {
        setIsInView(false);
        count.set(0); 
      }}
    >
      {rounded}
    </motion.span>
  );
};

export default AnimatedCounter;
