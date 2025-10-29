import { useEffect } from "react";
import { motion, stagger, useAnimate } from "motion/react";
import clsx from "clsx";

export const TextGenerateEffect = ({ words, className }) => {
  const [scope, animate] = useAnimate();
  let wordsArray = words.split(" ");
  useEffect(() => {
    animate(
      "span",
      {
        opacity: 1,
      },
      {
        duration: 2,
        delay: stagger(0.2),
      }
    );
  }, [words]);

  const renderWords = () => {
    return (
      <motion.div ref={scope}>
        {wordsArray.map((word, idx) => {
          return (
            <motion.span
              key={word + idx}
              className="text-transparent bg-clip-text bg-gradient-to-b opacity-0 from-neutral-100 to-neutral-100/80"
            >
              {word}{" "}
            </motion.span>
          );
        })}
      </motion.div>
    );
  };

  return (
    <div className={clsx("font-sans whitespace-pre-line", className)}>
      {renderWords()}
    </div>
  );
};
