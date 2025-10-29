import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import Head from "next/head";
import { Blurhash } from "react-blurhash";
import clsx from "clsx";

import { TextGenerateEffect } from "@/components/text-generate-effect";
import getCurrentTime from "../utils/getCurrentTime";

const backupPoem =
  "Moments in life, fleeting and rare,\nLove in the air, suffused so fair,\nHearts intertwined, two souls embrace,\nLife, a journey, a beautiful chase";
const backupPoet = "pablo neruda";
const backupImageUrl =
  "https://images.unsplash.com/photo-1535323341863-35008c694623?crop=entropy&cs=srgb&fm=jpg&ixid=M3w1ODMzNjF8MHwxfGFsbHx8fHx8fHx8fDE3MTM5MTM4Nzh8&ixlib=rb-4.0.3&q=85";
const backupBlurhash = "LRG%j7EeEKNa%4EMsWs:0wNY%1of";
const backupImageAlt = "purple sky";

export default function Home() {
  const [data, setData] = useState({
    poem: "",
    poet: "",
    imageUrl: "",
    blurhash: backupBlurhash,
    imageAlt: "",
  });
  const dataRef = useRef(data);
  dataRef.current = data;
  const [currentTime, setCurrentTime] = useState("");
  const [blurAmount, setBlurAmount] = useState("backdrop-blur-none");
  const [prevImage, setPrevImage] = useState("");
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const [showFooterLink, setShowFooterLink] = useState(false);

  const toggleVisibility = () => {
    setShowFooterLink(!showFooterLink);
  };

  const fetchPoemAndImage = async () => {
    const currentLocalTime = getCurrentTime();
    let newData = {
      poem: backupPoem,
      poet: backupPoet,
      imageUrl: backupImageUrl,
      blurhash: backupBlurhash,
      imageAlt: backupImageAlt,
    };

    try {
      const response = await fetch("/api/fetchData");
      const apiData = await response.json();

      newData = {
        poem: apiData.poem || backupPoem,
        poet: apiData.poet || backupPoet,
        imageUrl:
          apiData.imageUrl || dataRef.current.imageUrl || backupImageUrl,
        blurhash:
          apiData.blurhash || dataRef.current.blurhash || backupBlurhash,
        imageAlt:
          apiData.imageAlt || dataRef.current.imageAlt || backupImageAlt,
      };
      setData(newData);
    } catch (error) {
      console.error("Failed to fetch poem and image:", error);
      setData(newData);
    } finally {
      setShowFooterLink(false);
      localStorage.setItem("data", JSON.stringify(newData));
      localStorage.setItem("time", currentLocalTime);
    }
  };

  useEffect(() => {
    const savedData = localStorage.getItem("data");
    const savedTime = localStorage.getItem("time");
    const currentLocalTime = getCurrentTime();
    setCurrentTime(currentLocalTime);

    if (savedTime === currentLocalTime && savedData) {
      setData(JSON.parse(savedData));
    } else {
      fetchPoemAndImage();
    }

    const syncIntervalWithSystemClock = () => {
      const now = new Date();
      const delay = 60000 - (now.getSeconds() * 1000 + now.getMilliseconds());
      setTimeout(() => {
        fetchPoemAndImage();
        setCurrentTime(getCurrentTime());
        syncIntervalWithSystemClock();
      }, delay);
    };

    syncIntervalWithSystemClock();

    return () => clearTimeout(syncIntervalWithSystemClock);
  }, []);

  useEffect(() => {
    if (data.imageUrl === prevImage || prevImage === "") {
      setBlurAmount("backdrop-blur-none");
    } else {
      setBlurAmount("backdrop-blur-3xl");
    }
  }, [data]);

  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <title>clockverse - a poem for every minute</title>
      </Head>
      <div
        className="flex flex-col justify-center items-center h-dvh w-dvw"
        onClick={toggleVisibility}
      >
        <div className="absolute inset-0 z-40 bg-black opacity-30"></div>
        <div
          className={clsx(
            "absolute inset-0 z-40 ease-in transistion duration-[3000ms]",
            blurAmount
          )}
        ></div>
        <div className="absolute top-12 left-1/2 z-50 text-4xl transform -translate-x-1/2 md:top-36 md:text-6xl">
          {currentTime}
        </div>
        {data.poem && (
          <>
            <Image
              src={data.imageUrl}
              alt={data.imageAlt || "An image from Unsplash"}
              fill
              className={clsx(
                "absolute object-cover",
                isImageLoaded || !firstLoad ? "z-30" : "z-10",
                firstLoad ? "hidden" : ""
              )}
              priority
              onLoad={() => {
                setBlurAmount("backdrop-blur-none");
                setTimeout(() => {
                  setPrevImage(data.imageUrl);
                  setIsImageLoaded(true);
                  if (firstLoad) setFirstLoad(false);
                }, 1000);
              }}
            />
            {prevImage && (
              <Image
                src={prevImage}
                alt="An image from Unsplash"
                fill
                className={clsx(
                  "absolute object-cover",
                  isImageLoaded || !firstLoad ? "z-10" : "z-30",
                  firstLoad ? "hidden" : ""
                )}
              />
            )}
            <div className="flex absolute top-1/2 left-1/2 z-50 justify-center items-center px-8 py-16 w-full transform -translate-x-1/2 -translate-y-1/2">
              <TextGenerateEffect
                key={data.poem}
                words={data.poem}
                className="text-3xl md:text-5xl md:leading-normal"
              />
            </div>
            <div className="absolute right-0 left-0 bottom-12 z-50 md:bottom-36">
              {showFooterLink ? (
                <Link href="http://twitter.com/_rittik" target="_blank">
                  <TextGenerateEffect
                    words="by @_rittik"
                    className={
                      "w-full tracking-widest text-center text-orange-300 hover:underline underline-offset-8 md:text-xl"
                    }
                  />
                </Link>
              ) : (
                <TextGenerateEffect
                  words={`in the style of ${data.poet}`}
                  className="w-full text-center md:text-xl"
                />
              )}
            </div>
          </>
        )}
        <Blurhash
          hash={data.blurhash}
          width="100%"
          height="100%"
          resolutionX={32}
          resolutionY={32}
          punch={1}
          style={{
            filter: "blur(20px)",
          }}
        />
      </div>
    </>
  );
}
