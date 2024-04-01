import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Head from "next/head";
import { Blurhash } from "react-blurhash";
import clsx from "clsx";

import { TextGenerateEffect } from "@/components/text-generate-effect";
import getCurrentTime from "./utils/getCurrentTime";

export default function Home() {
  const [data, setData] = useState({
    poem: "",
    poet: "",
    imageUrl: "",
    blurhash: "L9FFjRNJKQ_3~q4.xCRPK7^+M{V@",
    imageAlt: "",
  });
  const backupImageUrl =
    "https://images.unsplash.com/photo-1710976151734-72b48a6d66f4?q=80&w=2548&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
  const backupBlurhash = "LE9@L+~pM_M|?a%MR,M|IpRkWBNG";
  const backupImageAlt = "a group of people crossing a street in a city";
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString("en-US", {
      hour12: true,
      hour: "2-digit",
      minute: "2-digit",
    })
  );
  const [blurAmount, setBlurAmount] = useState("backdrop-blur-none");
  const [prevImage, setPrevImage] = useState("");
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const fetchPoemAndImage = async () => {
    const currentTimeParam = new Date().toLocaleTimeString("en-US", {
      hour12: true,
      hour: "2-digit",
      minute: "2-digit",
    });
    const timeZoneName = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const response = await fetch(
      `/api/fetchData?time=${encodeURIComponent(
        currentTimeParam
      )}&tz=${encodeURIComponent(timeZoneName)}`
    );
    const apiData = await response.json();
    console.log(apiData);
    const newData = {
      poem: apiData.poem || "Backup poem text",
      poet: apiData.poet || "Backup poet name",
      imageUrl: apiData.imageUrl || data.imageUrl || backupImageUrl,
      blurhash: apiData.blurhash || data.blurhash || backupBlurhash,
      imageAlt: apiData.imageAlt || data.imageAlt || backupImageAlt,
    };
    setData(newData);
    const currentTime = getCurrentTime();
    localStorage.setItem("data", JSON.stringify(newData));
    localStorage.setItem("time", currentTime);
  };

  useEffect(() => {
    let previousMinute = new Date().getMinutes();
    const savedData = localStorage.getItem("data");
    const savedTime = localStorage.getItem("time");
    const currentTime = getCurrentTime();
    if (savedTime === currentTime && savedData) {
      setData(JSON.parse(savedData));
    } else {
      fetchPoemAndImage();
    }

    const interval = setInterval(() => {
      const currentMinute = new Date().getMinutes();
      const newTime = getCurrentTime();

      if (currentMinute !== previousMinute) {
        fetchPoemAndImage();
        previousMinute = currentMinute;
      }

      setCurrentTime(newTime);
    }, 1000);

    return () => clearInterval(interval);
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
      <div className="flex flex-col justify-center items-center h-dvh w-dvw">
        <div className="relative w-full h-full">
          <div className="absolute inset-0 bg-black opacity-30 z-40"></div>
          <div
            className={clsx(
              "absolute inset-0 z-40 transistion duration-[3000ms] ease-in",
              blurAmount
            )}
          ></div>
          <div className="absolute top-12 md:top-36 left-1/2 transform -translate-x-1/2 z-50 md:text-6xl text-4xl">
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
                  isImageLoaded ? "z-30" : "z-10"
                )}
                priority
                onLoad={() => {
                  console.log("Image loaded");
                  setBlurAmount("backdrop-blur-none");
                  setTimeout(() => {
                    setPrevImage(data.imageUrl);
                    setIsImageLoaded(true);
                  }, 1000);
                }}
              />
              {prevImage && (
                <Image
                  src={prevImage}
                  alt=""
                  fill
                  className={clsx(
                    "absolute object-cover",
                    isImageLoaded ? "z-10" : "z-30"
                  )}
                />
              )}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-8 py-16 w-full flex justify-center items-center z-50">
                <TextGenerateEffect words={data.poem} />
              </div>
              <div className="absolute bottom-12 md:bottom-36 left-1/2 transform -translate-x-1/2 z-50 md:text-xl group">
                <span className="bg-clip-text text-transparent bg-gradient-to-b from-neutral-100 to-neutral-100/80 whitespace-nowrap italic group-hover:hidden">
                  in the style of {data.poet}
                </span>
                <Link
                  href="http://twitter.com/_rittik"
                  className="hidden group-hover:block text-orange-300 tracking-widest hover:underline underline-offset-8"
                >
                  by @_rittik
                </Link>
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
            style={{ filter: "blur(20px)" }}
          />
        </div>
      </div>
    </>
  );
}
