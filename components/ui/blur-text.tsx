"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface BlurTextProps extends HTMLMotionProps<"div"> {
  text: string;
  delay?: number;
  className?: string;
  wordClassName?: string;
}

export function BlurText({
  text,
  delay = 0,
  className,
  wordClassName,
  ...props
}: BlurTextProps) {
  const words = text.split(" ");

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: delay,
      },
    },
  };

  const child = {
    hidden: {
      opacity: 0,
      filter: "blur(10px)",
      y: 20,
    },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="visible"
      className={cn("flex flex-wrap gap-x-[0.25em]", className)}
      {...props}
    >
      {words.map((word, index) => (
        <motion.span
          key={index}
          variants={child as any}
          className={cn("inline-block", wordClassName)}
        >
          {word === "<br/>" ? <br /> : word}
        </motion.span>
      ))}
    </motion.div>
  );
}
