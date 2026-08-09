import React from 'react';
import { motion } from 'framer-motion';

export const Card = ({ children, className = '', hover = false, ...props }: any) => {
  if (hover) {
    return (
      <motion.div className={`glass-card ${className}`} whileHover={{ scale: 1.02 }} {...props}>
        {children}
      </motion.div>
    );
  }
  return (
    <div className={`glass-card ${className}`} {...props}>
      {children}
    </div>
  );
};
