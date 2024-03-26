import { useEffect } from "react";
import { motion, stagger, useAnimate } from "framer-motion";

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
          // Check if the word is actually a newline character
          if (word === "\n") {
            // Return a break element for new lines
            return <br key={"newline" + idx} />;
          }
          return (
            <motion.span
              key={word + idx}
              className="bg-clip-text text-transparent bg-gradient-to-b from-neutral-100 to-neutral-100/80 opacity-0"
            >
              {word}{" "}
            </motion.span>
          );
        })}
      </motion.div>
    );
  };

  return (
    <div className={className}>
      <div className="">
        <div className="whitespace-pre-line font-sans md:text-5xl text-3xl md:leading-normal">
          {renderWords()}
        </div>
      </div>
    </div>
  );
};
